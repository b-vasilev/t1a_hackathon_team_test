import json
import logging
import os
import re

import litellm
from bs4 import BeautifulSoup
from curl_cffi.requests import AsyncSession

from .prompts import ANALYSIS_USER_PROMPT, FIND_URL_SYSTEM, FIND_URL_USER, GRADING_RUBRIC

LLM_MODEL = os.getenv("LLM_MODEL", "anthropic/claude-haiku-4-5-20251001")
LLM_API_KEY = os.getenv("LLM_API_KEY")
LLM_BASE_URL = os.getenv("LLM_BASE_URL")

logger = logging.getLogger("policylens.analyzer")

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


def _has_useful_content(html: str, min_length: int = 500) -> bool:
    """Check if HTML response has enough text to be useful, even on non-200 status."""
    text = _extract_text(html, 5000)
    return len(text) >= min_length


async def fetch_text(url: str, max_chars: int = 50000) -> str:
    logger.info("=== fetch_text START for %s ===", url)
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
            # Accept non-200 responses if they have useful content
            has_content = _has_useful_content(resp.text)
            logger.info("[Attempt 1] has_useful_content=%s", has_content)
            if resp.status_code < 400 or has_content:
                extracted = _extract_text(resp.text, max_chars)
                logger.info("[Attempt 1] SUCCESS — extracted %d chars", len(extracted))
                return extracted
            logger.info("[Attempt 1] Raising for status %d", resp.status_code)
            resp.raise_for_status()
        except Exception as e:
            logger.warning("[Attempt 1] FAILED — %s: %s", type(e).__name__, e)

        # Attempt 2: Google webcache
        try:
            from urllib.parse import quote_plus

            cache_url = f"https://webcache.googleusercontent.com/search?q=cache:{quote_plus(url)}"
            logger.info("[Attempt 2] Google cache: %s", cache_url)
            resp = await session.get(cache_url)
            logger.info("[Attempt 2] Status=%d", resp.status_code)
            resp.raise_for_status()
            logger.info("[Attempt 2] SUCCESS")
            return _extract_text(resp.text, max_chars)
        except Exception as e2:
            logger.warning("[Attempt 2] FAILED — %s: %s", type(e2).__name__, e2)

        # Attempt 3: archive.org latest snapshot
        try:
            wb_url = f"https://web.archive.org/web/2/{url}"
            logger.info("[Attempt 3] Wayback Machine: %s", wb_url)
            resp = await session.get(wb_url)
            logger.info("[Attempt 3] Status=%d", resp.status_code)
            resp.raise_for_status()
            logger.info("[Attempt 3] SUCCESS")
            return _extract_text(resp.text, max_chars)
        except Exception as e3:
            logger.warning("[Attempt 3] FAILED — %s: %s", type(e3).__name__, e3)

        # Attempt 4: Jina Reader (renders JS, bypasses blocks)
        try:
            jina_url = f"https://r.jina.ai/{url}"
            logger.info("[Attempt 4] Jina Reader: %s", jina_url)
            resp = await session.get(jina_url, headers={"Accept": "text/html"})
            logger.info("[Attempt 4] Status=%d, content_length=%d", resp.status_code, len(resp.text))
            resp.raise_for_status()
            text = resp.text.strip()
            if len(text) >= 500:
                logger.info("[Attempt 4] SUCCESS — %d chars", len(text))
                return text[:max_chars]
            logger.warning("[Attempt 4] Content too short (%d chars)", len(text))
        except Exception as e4:
            logger.warning("[Attempt 4] FAILED — %s: %s", type(e4).__name__, e4)

    logger.error("=== fetch_text ALL METHODS FAILED for %s ===", url)
    raise RuntimeError(f"Could not fetch privacy policy from {url} (all methods failed)")


CATEGORY_KEYS = ["data_collection", "data_sharing", "data_retention", "tracking", "user_rights"]


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
    response = await litellm.acompletion(**kwargs)
    usage = response.usage
    logger.info(
        "LLM call completed | tokens: prompt=%d completion=%d total=%d",
        usage.prompt_tokens,
        usage.completion_tokens,
        usage.total_tokens,
    )
    return response.choices[0].message.content.strip()


def _empty_result(summary: str) -> dict:
    return {
        "grade": "N/A",
        "summary": summary,
        "red_flags": [],
        "warnings": [],
        "positives": [],
        "categories": {},
        "highlights": [],
    }


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
    red_flags = data.get("red_flags", [])
    if not isinstance(red_flags, list):
        red_flags = []
    warnings = data.get("warnings", [])
    if not isinstance(warnings, list):
        warnings = []
    positives = data.get("positives", [])
    if not isinstance(positives, list):
        positives = []

    return {
        "grade": overall_grade,
        "summary": highlights[0] if highlights else "Analysis complete.",
        "red_flags": red_flags[:3],
        "warnings": warnings[:3],
        "positives": positives[:3],
        "categories": categories,
        "highlights": highlights[:5],
    }


async def find_privacy_policy_url(website_url: str) -> str | None:
    logger.info("Discovering privacy policy URL for %s", website_url)
    try:
        homepage_text = await fetch_text(website_url, max_chars=5000)
    except Exception:
        logger.warning("Could not fetch homepage for %s", website_url)
        return None

    raw = await _llm_call(
        system=FIND_URL_SYSTEM,
        user=FIND_URL_USER.format(website_url=website_url, homepage_text=homepage_text),
        max_tokens=200,
    )

    result = raw.strip()
    if result == "NOT_FOUND" or not result.startswith("http"):
        logger.info("No privacy policy URL found for %s", website_url)
        return None
    logger.info("Found privacy policy URL for %s → %s", website_url, result)
    return result


async def analyze_policy(privacy_policy_url: str) -> dict:
    logger.info("Analyzing policy: %s", privacy_policy_url)
    try:
        policy_text = await fetch_text(privacy_policy_url, max_chars=50000)
    except Exception as e:
        logger.error("Failed to fetch policy %s: %s", privacy_policy_url, e)
        return _empty_result(f"Could not fetch privacy policy: {e}")

    raw = await _llm_call(
        system=GRADING_RUBRIC,
        user=ANALYSIS_USER_PROMPT.format(policy_text=policy_text[:15000]),
        max_tokens=1500,
    )

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
    logger.info("Analysis complete for %s → grade=%s", privacy_policy_url, result["grade"])
    return result
