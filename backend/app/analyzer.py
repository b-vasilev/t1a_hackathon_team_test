import json
import os
import re
import httpx
import litellm
from bs4 import BeautifulSoup
from .prompts import GRADING_RUBRIC, ANALYSIS_USER_PROMPT, FIND_URL_SYSTEM, FIND_URL_USER

LLM_MODEL = os.getenv("LLM_MODEL", "anthropic/claude-haiku-4-5-20251001")
LLM_API_KEY = os.getenv("LLM_API_KEY")
LLM_BASE_URL = os.getenv("LLM_BASE_URL")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}

GPA_MAP = {
    "A+": 4.3, "A": 4.0, "A-": 3.7,
    "B+": 3.3, "B": 3.0, "B-": 2.7,
    "C+": 2.3, "C": 2.0, "C-": 1.7,
    "D+": 1.3, "D": 1.0, "D-": 0.7,
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


async def fetch_text(url: str, max_chars: int = 50000) -> str:
    async with httpx.AsyncClient(headers=HEADERS, timeout=15, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        text = soup.get_text(separator=" ", strip=True)
        return text[:max_chars]


CATEGORY_KEYS = ["data_collection", "data_sharing", "data_retention", "tracking", "user_rights"]


async def _llm_call(system: str, user: str, max_tokens: int = 1024) -> str:
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
    try:
        homepage_text = await fetch_text(website_url, max_chars=5000)
    except Exception:
        return None

    raw = await _llm_call(
        system=FIND_URL_SYSTEM,
        user=FIND_URL_USER.format(website_url=website_url, homepage_text=homepage_text),
        max_tokens=200,
    )

    result = raw.strip()
    if result == "NOT_FOUND" or not result.startswith("http"):
        return None
    return result


async def analyze_policy(privacy_policy_url: str) -> dict:
    try:
        policy_text = await fetch_text(privacy_policy_url, max_chars=50000)
    except Exception as e:
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

    return _normalize(data)
