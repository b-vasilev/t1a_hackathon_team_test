import asyncio
import hashlib
import json
import logging
import os
import re
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

import litellm
from bs4 import BeautifulSoup, Tag
from curl_cffi.requests import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession as DBSession

from .mock_data import get_mock_actions, get_mock_analysis
from .models import PolicyText
from .prompts import (
    ACTIONS_SYSTEM,
    ACTIONS_USER_PROMPT,
    ANALYSIS_USER_PROMPT,
    CHAT_SYSTEM,
    FIND_URL_SYSTEM,
    FIND_URL_USER,
    GRADING_RUBRIC,
)

LLM_MODEL = os.getenv("LLM_MODEL", "anthropic/claude-haiku-4-5-20251001")
LLM_API_KEY = os.getenv("LLM_API_KEY")
LLM_BASE_URL = os.getenv("LLM_BASE_URL")

logger = logging.getLogger("privacylens.analyzer")


class LLMUnavailableError(Exception):
    """Raised when the LLM API is unreachable."""


GPA_MAP = {
    "A+": 4.3,
    "A": 4.0,
    "A-": 3.7,
    "B+": 3.3,
    "B": 3.0,
    "B-": 2.7,
    "C+": 2.3,
    "C": 2.0,
    "C-": 1.7,
    "D+": 1.3,
    "D": 1.0,
    "D-": 0.7,
    "F": 0.0,
}

GPA_TO_GRADE = sorted(GPA_MAP.items(), key=lambda x: x[1], reverse=True)


def gpa_to_letter(gpa: float) -> str:
    for grade, value in GPA_TO_GRADE:
        if gpa >= value - 0.15:
            return grade
    return "F"


def average_grade(grades: list[str]) -> str:
    valid = [GPA_MAP[g] for g in grades if g in GPA_MAP]
    if not valid:
        return "N/A"
    avg = sum(valid) / len(valid)
    return gpa_to_letter(avg)


def _extract_text(html: str, max_chars: int) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()
    text = soup.get_text(separator=" ", strip=True)
    return text[:max_chars]


def _extract_structured_text(html: str, max_chars: int) -> tuple[str, bool]:
    """Extract text from HTML preserving section structure as markdown."""
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()

    heading_tags = {"h1", "h2", "h3", "h4"}
    parts: list[str] = []
    char_count = 0

    for element in soup.body.descendants if soup.body else soup.descendants:
        if char_count >= max_chars:
            return "\n\n".join(parts)[:max_chars], True

        if isinstance(element, Tag):
            if element.name in heading_tags:
                text = element.get_text(strip=True)
                if text:
                    parts.append(f"## {text}")
                    char_count += len(text) + 4
            elif element.name == "p":
                text = element.get_text(separator=" ", strip=True)
                if text:
                    parts.append(text)
                    char_count += len(text) + 2
            elif element.name == "li":
                text = element.get_text(separator=" ", strip=True)
                if text:
                    parts.append(f"- {text}")
                    char_count += len(text) + 4

    result = "\n\n".join(parts)
    if len(result) > max_chars:
        return result[:max_chars], True
    return result, False


def _build_section_index(text: str) -> list[dict]:
    """Build a section index from structured markdown text."""
    sections: list[dict] = []
    blocks = text.split("\n\n")
    current_offset = 0

    for block in blocks:
        if block.startswith("## "):
            heading = block[3:].strip()
            if sections:
                sections[-1]["length"] = current_offset - sections[-1]["offset"]
            sections.append({"heading": heading, "offset": current_offset})
        current_offset += len(block) + 2  # +2 for \n\n separator

    if sections:
        sections[-1]["length"] = len(text) - sections[-1]["offset"]

    return sections


def _hash_text(text: str) -> str:
    """Compute SHA-256 hash of policy text."""
    return hashlib.sha256(text.encode()).hexdigest()


def find_relevant_sections(question: str, sections: list[dict], full_text: str, max_chars: int = 15000) -> str:
    """Find sections most relevant to the user's question using keyword overlap."""
    if not sections:
        return full_text[:max_chars]

    question_words = {w.lower() for w in re.findall(r"\w+", question) if len(w) > 1}

    scored: list[tuple[float, dict]] = []
    for section in sections:
        heading_words = {w.lower() for w in re.findall(r"\w+", section["heading"]) if len(w) > 1}
        overlap = len(question_words & heading_words)
        if overlap > 0:
            scored.append((overlap, section))

    scored.sort(key=lambda x: x[0], reverse=True)
    top_sections = scored[:3]

    if not top_sections:
        return full_text[:max_chars]

    parts: list[str] = []
    total = 0
    for _, section in top_sections:
        offset = section["offset"]
        length = section.get("length", max_chars)
        chunk = full_text[offset : offset + length]
        if total + len(chunk) > max_chars:
            chunk = chunk[: max_chars - total]
        parts.append(chunk)
        total += len(chunk)
        if total >= max_chars:
            break

    return "\n\n".join(parts)


async def get_or_create_policy_text(db: DBSession, source_url: str, text: str, was_truncated: bool) -> PolicyText:
    """Get existing PolicyText by hash or create a new one."""
    content_hash = _hash_text(text)
    result = await db.execute(select(PolicyText).where(PolicyText.content_hash == content_hash))
    existing = result.scalar_one_or_none()
    if existing:
        logger.info("PolicyText cache hit (hash=%s…)", content_hash[:12])
        return existing

    sections = _build_section_index(text)
    policy_text = PolicyText(
        content_hash=content_hash,
        content=text,
        char_count=len(text),
        was_truncated=was_truncated,
        sections_json=json.dumps(sections) if sections else None,
        source_url=source_url,
    )
    db.add(policy_text)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        result = await db.execute(select(PolicyText).where(PolicyText.content_hash == content_hash))
        existing = result.scalar_one_or_none()
        if existing:
            logger.info("PolicyText race resolved (hash=%s…)", content_hash[:12])
            return existing
        raise
    logger.info("PolicyText created (hash=%s…, %d chars, %d sections)", content_hash[:12], len(text), len(sections))
    return policy_text


BLOCKED_PAGE_MARKERS = [
    "prove your humanity",
    "complete the challenge",
    "captcha",
    "verify you are human",
    "not a robot",
    "access denied",
    "enable javascript and cookies to continue",
    "just a moment",  # Cloudflare
    "checking your browser",  # Cloudflare
    "attention required",  # Cloudflare
    "please turn javascript on",
    "ray id",  # Cloudflare block page
    "please verify you are a human",
    "one more step",
    "security check",
]

GOOGLE_PAGE_MARKERS = [
    "antes de continuar para a google",  # Google consent (Portuguese)
    "before you continue to google",  # Google consent (English)
    "fornecer e manter os serviços google",  # Google consent details
    "a sua pesquisa",  # Google search results (Portuguese)
    "your search -",  # Google search results (English)
    "did not match any documents",
    "não encontrou nenhum documento",
    "manter os serviços google",
]


def _is_blocked_page(text: str) -> bool:
    """Detect CAPTCHA challenges, bot blocks, and other access-denied pages."""
    if not text or len(text.strip()) < 200:
        return True
    lower = text.lower()
    matches = sum(1 for marker in BLOCKED_PAGE_MARKERS if marker in lower)
    return matches >= 2


def _is_google_page(text: str) -> bool:
    """Detect Google consent, search, or error pages returned instead of cached content."""
    if not text:
        return False
    lower = text.lower()
    return any(marker in lower for marker in GOOGLE_PAGE_MARKERS)


def _has_useful_content(html: str, min_length: int = 500) -> bool:
    """Check if HTML response has enough text to be useful, even on non-200 status."""
    text = _extract_text(html, 5000)
    if _is_blocked_page(text):
        return False
    return len(text) >= min_length


async def _search_web(query: str) -> str:
    """Search via DuckDuckGo HTML and return extracted result text."""
    url = "https://html.duckduckgo.com/html/"
    logger.info("Web search: %s", query)
    try:
        async with AsyncSession(impersonate="chrome", timeout=15) as session:
            resp = await session.post(url, data={"q": query})
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            results = []
            for r in soup.select(".result"):
                title_el = r.select_one(".result__a")
                snippet_el = r.select_one(".result__snippet")
                title = title_el.get_text(strip=True) if title_el else ""
                raw_href = title_el.get("href", "") if title_el else ""
                # DuckDuckGo wraps links in redirects: //duckduckgo.com/l/?uddg=<encoded_url>
                if "uddg=" in raw_href:
                    href = parse_qs(urlparse(raw_href).query).get("uddg", [raw_href])[0]
                else:
                    href = raw_href
                snippet = snippet_el.get_text(strip=True) if snippet_el else ""
                if title:
                    results.append(f"{title}\n{href}\n{snippet}")
            text = "\n\n".join(results[:15])
            logger.info("Web search returned %d results (%d chars)", len(results), len(text))
            return text
    except Exception as e:
        logger.warning("Web search failed: %s: %s", type(e).__name__, e)
        return ""


def _clean_jina_text(text: str) -> str:
    """Clean Jina Reader markdown output into our structured format.

    Jina prepends metadata lines (Title:, URL Source:, Markdown Content:)
    and uses standard markdown syntax that we need to normalize.
    """
    # Strip Jina metadata header lines
    lines = text.split("\n")
    content_start = 0
    for i, line in enumerate(lines):
        if line.startswith("Markdown Content:"):
            content_start = i + 1
            break
        if line.startswith(("Title:", "URL Source:")):
            content_start = i + 1

    cleaned_lines = lines[content_start:]
    result = "\n".join(cleaned_lines).strip()

    # Convert markdown links [text](url) → text
    result = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", result)

    # Convert setext-style headings (text followed by === or ---) to ## headings
    result = re.sub(r"^(.+)\n[=]{2,}\s*$", r"## \1", result, flags=re.MULTILINE)
    result = re.sub(r"^(.+)\n[-]{2,}\s*$", r"## \1", result, flags=re.MULTILINE)

    # Remove any remaining standalone separator lines (=== or ---)
    result = re.sub(r"^[=\-]{3,}\s*$", "", result, flags=re.MULTILINE)

    # Normalize heading levels: ###+ → ##
    result = re.sub(r"^#{1,6}\s+", "## ", result, flags=re.MULTILINE)

    # Convert markdown bullet markers (* or +) to our format (-)
    result = re.sub(r"^[*+]\s+", "- ", result, flags=re.MULTILINE)

    # Remove bold/italic markers
    result = re.sub(r"\*{1,3}([^*]+)\*{1,3}", r"\1", result)

    return result


def _force_english_url(url: str) -> str:
    """Append common English locale query parameters to request the English version."""
    parsed = urlparse(url)
    existing = parse_qs(parsed.query, keep_blank_values=True)
    lang_params = {"hl": "en", "lang": "en", "locale": "en"}
    for key, val in lang_params.items():
        if key not in existing:
            existing[key] = [val]
    new_query = urlencode(existing, doseq=True)
    return urlunparse(parsed._replace(query=new_query))


async def fetch_text(url: str, max_chars: int = 80000, *, structured: bool = False) -> tuple[str, bool]:
    """Fetch text from a URL. Returns (text, was_truncated).

    When structured=True, preserves heading structure as markdown.
    """
    original_url = url
    url = _force_english_url(url)
    extract = _extract_structured_text if structured else lambda html, mc: (_extract_text(html, mc), False)

    logger.info("=== fetch_text START for %s (structured=%s) ===", url, structured)
    headers = {
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
    }
    async with AsyncSession(impersonate="chrome", timeout=20, headers=headers) as session:
        # Attempt 1: direct fetch
        try:
            logger.info("[Attempt 1] Direct fetch: %s", url)
            resp = await session.get(url)
            logger.info("[Attempt 1] Status=%d, content_length=%d", resp.status_code, len(resp.text))
            has_content = _has_useful_content(resp.text)
            logger.info("[Attempt 1] has_useful_content=%s", has_content)
            if resp.status_code < 400 or has_content:
                text, truncated = extract(resp.text, max_chars)
                if not _is_blocked_page(text) and len(text.strip()) >= 200:
                    logger.info("[Attempt 1] SUCCESS — extracted %d chars", len(text))
                    return text, truncated
                logger.warning("[Attempt 1] Extracted text is blocked/empty, trying fallbacks")
            else:
                logger.info("[Attempt 1] Raising for status %d", resp.status_code)
                resp.raise_for_status()
        except Exception as e:
            logger.warning("[Attempt 1] FAILED — %s: %s", type(e).__name__, e)

        # Attempt 2: Jina Reader (renders JS, bypasses blocks — most reliable)
        # Use original URL (without locale params) since Jina handles rendering itself
        try:
            jina_url = f"https://r.jina.ai/{original_url}"
            logger.info("[Attempt 2] Jina Reader: %s", jina_url)
            async with AsyncSession(timeout=30) as jina_session:
                resp = await jina_session.get(jina_url, headers={"Accept": "text/html"})
            logger.info("[Attempt 2] Status=%d, content_length=%d", resp.status_code, len(resp.text))
            resp.raise_for_status()
            text = _clean_jina_text(resp.text)
            if not _is_blocked_page(text) and len(text) >= 500:
                logger.info("[Attempt 2] SUCCESS — %d chars", len(text))
                truncated = len(text) > max_chars
                return text[:max_chars], truncated
            logger.warning("[Attempt 2] Content blocked or too short (%d chars)", len(text))
        except Exception as e2:
            logger.warning("[Attempt 2] FAILED — %s: %s", type(e2).__name__, e2)

        # Attempt 3: Google webcache
        try:
            from urllib.parse import quote_plus

            cache_url = f"https://webcache.googleusercontent.com/search?q=cache:{quote_plus(original_url)}"
            logger.info("[Attempt 3] Google cache: %s", cache_url)
            resp = await session.get(cache_url)
            logger.info("[Attempt 3] Status=%d", resp.status_code)
            resp.raise_for_status()
            text, truncated = extract(resp.text, max_chars)
            if _is_google_page(text):
                logger.warning("[Attempt 3] Got Google page instead of cached content, skipping")
            elif not _is_blocked_page(text) and len(text.strip()) >= 200:
                logger.info("[Attempt 3] SUCCESS")
                return text, truncated
            else:
                logger.warning("[Attempt 3] Extracted text is blocked/empty, trying fallbacks")
        except Exception as e3:
            logger.warning("[Attempt 3] FAILED — %s: %s", type(e3).__name__, e3)

        # Attempt 4: archive.org latest snapshot
        try:
            wb_url = f"https://web.archive.org/web/2/{original_url}"
            logger.info("[Attempt 4] Wayback Machine: %s", wb_url)
            resp = await session.get(wb_url)
            logger.info("[Attempt 4] Status=%d", resp.status_code)
            resp.raise_for_status()
            text, truncated = extract(resp.text, max_chars)
            if not _is_blocked_page(text) and len(text.strip()) >= 200:
                logger.info("[Attempt 4] SUCCESS")
                return text, truncated
            logger.warning("[Attempt 4] Extracted text is blocked/empty, trying fallbacks")
        except Exception as e4:
            logger.warning("[Attempt 4] FAILED — %s: %s", type(e4).__name__, e4)

    logger.error("=== fetch_text ALL METHODS FAILED for %s ===", url)
    raise RuntimeError(f"Could not fetch privacy policy from {url} (all methods failed)")


CATEGORY_KEYS = ["data_collection", "data_sharing", "data_retention", "tracking", "user_rights"]


_TRANSIENT_ERRORS = (
    litellm.InternalServerError,
    litellm.ServiceUnavailableError,
    litellm.RateLimitError,
    litellm.Timeout,
)
_MAX_RETRIES = 3
_RETRY_DELAYS = [2, 4, 8]  # seconds


async def _llm_call(system: str, user: str, max_tokens: int = 1024) -> str:
    logger.info("LLM call starting | model=%s | max_tokens=%d", LLM_MODEL, max_tokens)
    kwargs = dict(
        model=LLM_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        max_tokens=max_tokens,
        temperature=0,
    )
    if LLM_API_KEY:
        kwargs["api_key"] = LLM_API_KEY
    if LLM_BASE_URL:
        kwargs["api_base"] = LLM_BASE_URL

    last_exc: Exception | None = None
    for attempt in range(_MAX_RETRIES):
        try:
            response = await litellm.acompletion(**kwargs)
            usage = response.usage
            logger.info(
                "LLM call completed | attempt=%d | tokens: prompt=%d completion=%d total=%d",
                attempt + 1,
                usage.prompt_tokens,
                usage.completion_tokens,
                usage.total_tokens,
            )
            return response.choices[0].message.content.strip()
        except _TRANSIENT_ERRORS as e:
            last_exc = e
            if attempt < _MAX_RETRIES - 1:
                delay = _RETRY_DELAYS[attempt]
                logger.warning(
                    "LLM transient error (attempt %d/%d), retrying in %ds: %s: %s",
                    attempt + 1,
                    _MAX_RETRIES,
                    delay,
                    type(e).__name__,
                    e,
                )
                await asyncio.sleep(delay)
            else:
                logger.error(
                    "LLM API unreachable after %d attempts: %s: %s",
                    _MAX_RETRIES,
                    type(e).__name__,
                    e,
                )
        except Exception as e:
            logger.error("LLM API error (non-retryable): %s: %s", type(e).__name__, e)
            raise LLMUnavailableError(str(e)) from e

    raise LLMUnavailableError(str(last_exc)) from last_exc


async def _llm_chat_call(system: str, messages: list[dict], max_tokens: int = 512) -> str:
    """Like _llm_call but accepts a multi-turn messages list for chat."""
    logger.info("LLM chat call starting | model=%s | max_tokens=%d | turns=%d", LLM_MODEL, max_tokens, len(messages))
    full_messages = [{"role": "system", "content": system}, *messages]
    kwargs = dict(
        model=LLM_MODEL,
        messages=full_messages,
        max_tokens=max_tokens,
        temperature=0.2,
    )
    if LLM_API_KEY:
        kwargs["api_key"] = LLM_API_KEY
    if LLM_BASE_URL:
        kwargs["api_base"] = LLM_BASE_URL

    last_exc: Exception | None = None
    for attempt in range(_MAX_RETRIES):
        try:
            response = await litellm.acompletion(**kwargs)
            usage = response.usage
            logger.info(
                "LLM chat call completed | attempt=%d | tokens: prompt=%d completion=%d total=%d",
                attempt + 1,
                usage.prompt_tokens,
                usage.completion_tokens,
                usage.total_tokens,
            )
            return response.choices[0].message.content.strip()
        except _TRANSIENT_ERRORS as e:
            last_exc = e
            if attempt < _MAX_RETRIES - 1:
                delay = _RETRY_DELAYS[attempt]
                logger.warning(
                    "LLM chat transient error (attempt %d/%d), retrying in %ds: %s: %s",
                    attempt + 1,
                    _MAX_RETRIES,
                    delay,
                    type(e).__name__,
                    e,
                )
                await asyncio.sleep(delay)
            else:
                logger.error(
                    "LLM API unreachable (chat) after %d attempts: %s: %s",
                    _MAX_RETRIES,
                    type(e).__name__,
                    e,
                )
        except Exception as e:
            logger.error("LLM API error (chat, non-retryable): %s: %s", type(e).__name__, e)
            raise LLMUnavailableError(str(e)) from e

    raise LLMUnavailableError(str(last_exc)) from last_exc


def _format_analysis_context(analysis_context: dict) -> str:
    """Format analysis results into a readable context block for the chat prompt."""
    parts = [f"Summary: {analysis_context.get('summary', 'N/A')}"]

    if analysis_context.get("red_flags"):
        parts.append("Red flags:\n" + "\n".join(f"- {f}" for f in analysis_context["red_flags"]))
    if analysis_context.get("warnings"):
        parts.append("Warnings:\n" + "\n".join(f"- {w}" for w in analysis_context["warnings"]))
    if analysis_context.get("positives"):
        parts.append("Positives:\n" + "\n".join(f"- {p}" for p in analysis_context["positives"]))

    categories = analysis_context.get("categories", {})
    if categories:
        cat_lines = []
        for cat, info in categories.items():
            label = cat.replace("_", " ").title()
            cat_lines.append(f"- {label}: {info.get('grade', 'N/A')} — {info.get('finding', 'Not assessed')}")
        parts.append("Category grades:\n" + "\n".join(cat_lines))

    if analysis_context.get("highlights"):
        parts.append("Key highlights:\n" + "\n".join(f"- {h}" for h in analysis_context["highlights"]))

    actions = analysis_context.get("actions", [])
    if actions:
        action_lines = []
        for a in actions:
            line = f"- {a.get('label', 'Action')}"
            if a.get("description"):
                line += f": {a['description']}"
            if a.get("url"):
                line += f" ({a['url']})"
            action_lines.append(line)
        parts.append("What you can do:\n" + "\n".join(action_lines))

    return "Analysis results:\n" + "\n\n".join(parts)


async def chat_about_policy(
    service_name: str, grade: str, policy_text: str, messages: list[dict], analysis_context: dict | None = None
) -> str:
    """Answer user questions about a specific privacy policy."""
    context_str = _format_analysis_context(analysis_context) if analysis_context else ""
    system_prompt = CHAT_SYSTEM.format(
        service_name=service_name, grade=grade, policy_text=policy_text, analysis_context=context_str
    )
    # Wrap user messages in delimiters so the model can distinguish them from system content
    wrapped = []
    for m in messages:
        if m["role"] == "user":
            # Strip delimiter tags from user input to prevent delimiter escape
            sanitized = m["content"].replace("</user_message>", "").replace("<user_message>", "")
            wrapped.append({"role": "user", "content": f"<user_message>{sanitized}</user_message>"})
        else:
            wrapped.append(m)
    return await _llm_chat_call(system=system_prompt, messages=wrapped)


def _empty_result(summary: str) -> dict:
    return {
        "grade": "N/A",
        "summary": summary,
        "tldr": summary,
        "red_flags": [],
        "warnings": [],
        "positives": [],
        "categories": {},
        "highlights": [],
        "policy_text": None,
    }


def _normalize_finding(item) -> dict:
    """Normalize a finding to {text, quote} format. Handles both old strings and new objects."""
    if isinstance(item, dict):
        return {"text": str(item.get("text", "")), "quote": str(item.get("quote", ""))}
    return {"text": str(item), "quote": ""}


def _normalize_findings(items) -> list[dict]:
    if not isinstance(items, list):
        return []
    return [_normalize_finding(i) for i in items]


def _normalize(data: dict) -> dict:
    # Ensure categories dict has all 5 keys
    categories = data.get("categories", {})
    for key in CATEGORY_KEYS:
        if key not in categories or not isinstance(categories[key], dict):
            categories[key] = {"grade": "N/A", "finding": "Not assessed"}
        else:
            categories[key].setdefault("grade", "N/A")
            categories[key].setdefault("finding", "Not assessed")
    data["categories"] = categories

    # Compute overall grade as average of category grades
    category_grades = [categories[k]["grade"] for k in CATEGORY_KEYS]
    overall_grade = average_grade(category_grades)

    # Ensure list fields
    highlights = data.get("highlights", [])
    if not isinstance(highlights, list):
        highlights = []

    red_flags = _normalize_findings(data.get("red_flags", []))
    warnings = _normalize_findings(data.get("warnings", []))
    positives = _normalize_findings(data.get("positives", []))

    # Normalize alternatives (LLM only provides these for D/F grades)
    raw_alts = data.get("alternatives", [])
    alternatives = []
    if isinstance(raw_alts, list):
        for alt in raw_alts[:3]:
            if isinstance(alt, dict) and alt.get("name"):
                url = str(alt.get("url", ""))
                alternatives.append({
                    "name": str(alt["name"])[:60],
                    "description": str(alt.get("description", ""))[:100],
                    "url": url if url.startswith("http") else "",
                })
    tldr = data.get("tldr", "")
    if not tldr:
        tldr = highlights[0] if highlights else "Analysis complete."

    return {
        "grade": overall_grade,
        "summary": highlights[0] if highlights else "Analysis complete.",
        "tldr": tldr,
        "red_flags": red_flags[:3],
        "warnings": warnings[:3],
        "positives": positives[:3],
        "categories": categories,
        "highlights": highlights[:5],
        "alternatives": alternatives,
    }


async def find_privacy_policy_url(website_url: str) -> str | None:
    logger.info("Discovering privacy policy URL for %s", website_url)
    for attempt in range(2):
        try:
            homepage_text, _ = await fetch_text(website_url, max_chars=5000)
        except Exception:
            logger.warning("[Attempt %d] Could not fetch homepage for %s", attempt + 1, website_url)
            if attempt == 0:
                await asyncio.sleep(2)
            continue

        try:
            raw = await _llm_call(
                system=FIND_URL_SYSTEM,
                user=FIND_URL_USER.format(website_url=website_url, homepage_text=homepage_text),
                max_tokens=200,
            )
        except LLMUnavailableError:
            logger.warning("LLM unavailable for URL discovery of %s, returning None", website_url)
            return None

        result = raw.strip()
        if result != "NOT_FOUND" and result.startswith("http"):
            logger.info("Found privacy policy URL for %s → %s", website_url, result)
            return result

        logger.info("[Attempt %d] No privacy policy URL found for %s (got %r)", attempt + 1, website_url, result[:60])
        if attempt == 0:
            await asyncio.sleep(2)

    logger.warning("Could not find privacy policy URL for %s after 2 attempts", website_url)
    return None


async def analyze_policy(privacy_policy_url: str, service_name: str = "") -> dict:
    logger.info("Analyzing policy: %s", privacy_policy_url)
    try:
        policy_text, was_truncated = await fetch_text(privacy_policy_url, max_chars=80000, structured=True)
    except Exception as e:
        logger.error("Failed to fetch policy %s: %s", privacy_policy_url, e)
        return _empty_result(f"Could not fetch privacy policy: {e}")

    try:
        raw = await _llm_call(
            system=GRADING_RUBRIC,
            user=ANALYSIS_USER_PROMPT.format(policy_text=policy_text[:60000]),
            max_tokens=2048,
        )
    except LLMUnavailableError:
        logger.warning("LLM unavailable, returning mock analysis for %s", service_name)
        return get_mock_analysis(service_name)

    # Strip markdown code fences if present
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        # Fallback: extract JSON object from response
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group())
            except json.JSONDecodeError:
                return _empty_result("Analysis failed — could not parse response.")
        else:
            return _empty_result("Analysis failed — could not parse response.")

    result = _normalize(data)
    result["policy_text"] = policy_text
    result["was_truncated"] = was_truncated
    logger.info("Analysis complete for %s → grade=%s", privacy_policy_url, result["grade"])
    return result



async def analyze_policy_text(text: str, service_name: str = "") -> dict:
    """Analyze a raw privacy policy text — no URL fetching."""
    logger.info("Analyzing raw policy text (%d chars) for '%s'", len(text), service_name or "<unnamed>")

    if not text or len(text.strip()) < 50:
        return _empty_result("Policy text is too short to analyze.")

    try:
        raw = await _llm_call(
            system=GRADING_RUBRIC,
            user=ANALYSIS_USER_PROMPT.format(policy_text=text[:60000]),
            max_tokens=2048,
        )
    except LLMUnavailableError:
        logger.warning("LLM unavailable, returning mock analysis for '%s'", service_name)
        mock = get_mock_analysis(service_name)
        mock["policy_text"] = text
        mock["was_truncated"] = len(text) > 60000
        return mock

    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group())
            except json.JSONDecodeError:
                return _empty_result("Analysis failed — could not parse response.")
        else:
            return _empty_result("Analysis failed — could not parse response.")

    result = _normalize(data)
    result["policy_text"] = text
    result["was_truncated"] = len(text) > 60000
    logger.info("Raw text analysis complete for '%s' → grade=%s", service_name, result["grade"])
    return result


async def get_service_actions(service_name: str, website_url: str, policy_url: str | None = None) -> list[dict]:
    """Discover privacy action links (delete account, download data, etc.) for a service."""
    logger.info("Discovering privacy actions for %s (%s)", service_name, website_url)
    try:
        query = f"{service_name} delete account download data privacy settings opt out GDPR request"
        search_results = await _search_web(query)
        if not search_results:
            logger.info("No search results for %s, skipping actions", service_name)
            return []

        # Extract domain for prompt context
        domain = urlparse(website_url).netloc or website_url

        try:
            raw = await _llm_call(
                system=ACTIONS_SYSTEM,
                user=ACTIONS_USER_PROMPT.format(
                    service_name=service_name,
                    domain=domain,
                    search_results=search_results[:15000],
                ),
                max_tokens=1024,
            )
        except LLMUnavailableError:
            logger.warning("LLM unavailable, returning mock actions for %s", service_name)
            return get_mock_actions(service_name)

        # Strip markdown code fences if present
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)

        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            if match:
                try:
                    data = json.loads(match.group())
                except json.JSONDecodeError:
                    logger.warning("Could not parse actions JSON for %s", service_name)
                    return []
            else:
                logger.warning("Could not parse actions JSON for %s", service_name)
                return []
        actions = data.get("actions", [])

        # Validate each action has required fields and URL is on service domain
        base_domain = domain.removeprefix("www.")
        # Extract brand names for relaxed matching, e.g. "reddit" from "reddit.com"
        # Use the second-level domain (SLD) as the brand name
        domain_parts = base_domain.split(".")
        brands = {domain_parts[-2] if len(domain_parts) >= 2 else domain_parts[0]}
        # Also accept the policy URL's domain (e.g. YouTube uses google.com policy)
        if policy_url:
            policy_host = urlparse(policy_url).netloc.removeprefix("www.")
            policy_parts = policy_host.split(".")
            brands.add(policy_parts[-2] if len(policy_parts) >= 2 else policy_parts[0])
        validated = []
        for action in actions:
            if not all(k in action for k in ("label", "url", "category")):
                continue
            action_host = urlparse(action["url"]).netloc.removeprefix("www.")
            # Accept if action is on same domain OR its hostname contains a known brand
            # e.g. "support.reddithelp.com" contains "reddit", "myaccount.google.com" contains "google"
            if not (action_host.endswith(base_domain) or any(b in action_host for b in brands)):
                logger.info("Skipping action with off-domain URL: %s", action["url"])
                continue
            validated.append(action)

        logger.info("Found %d privacy actions for %s", len(validated), service_name)
        return validated
    except Exception as e:
        logger.warning("Failed to get actions for %s: %s: %s", service_name, type(e).__name__, e)
        return []
