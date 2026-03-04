import json
import os
import re
import httpx
from anthropic import AsyncAnthropic
from bs4 import BeautifulSoup

client = AsyncAnthropic(
    base_url=os.getenv("ANTHROPIC_BASE_URL", "https://api.anthropic.com"),
)

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


async def find_privacy_policy_url(website_url: str) -> str | None:
    try:
        homepage_text = await fetch_text(website_url, max_chars=5000)
    except Exception:
        return None

    prompt = (
        f"Return ONLY the full URL of the privacy policy for {website_url}. "
        f"Here is some text from the homepage:\n\n{homepage_text}\n\n"
        "Return ONLY the URL, nothing else. Return NOT_FOUND if no privacy policy URL is present."
    )

    message = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=256,
        messages=[{"role": "user", "content": prompt}],
    )

    result = message.content[0].text.strip()
    if result == "NOT_FOUND" or not result.startswith("http"):
        return None
    return result


async def analyze_policy(privacy_policy_url: str) -> dict:
    try:
        policy_text = await fetch_text(privacy_policy_url, max_chars=50000)
    except Exception as e:
        return {
            "grade": "N/A",
            "summary": f"Could not fetch privacy policy: {e}",
            "red_flags": [],
            "warnings": [],
            "clean_items": [],
        }

    prompt = f"""Analyze this privacy policy and return a JSON object with these exact fields:
- "grade": letter grade A+ through F based on privacy friendliness
- "summary": one sentence (max 120 chars) describing the overall privacy stance
- "red_flags": array of up to 3 serious privacy concerns (max 60 chars each)
- "warnings": array of up to 3 moderate concerns (max 60 chars each)
- "clean_items": array of up to 3 positive privacy practices (max 60 chars each)

Grade scale: A+ = excellent privacy, F = terrible privacy.
Return ONLY valid JSON, no markdown, no explanation.

Privacy policy text:
{policy_text}"""

    message = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()

    # Strip markdown code fences if present
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        # Fallback: extract JSON object from response
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            data = json.loads(match.group())
        else:
            data = {
                "grade": "N/A",
                "summary": "Analysis failed — could not parse response.",
                "red_flags": [],
                "warnings": [],
                "clean_items": [],
            }

    # Ensure all required fields exist
    data.setdefault("grade", "N/A")
    data.setdefault("summary", "")
    data.setdefault("red_flags", [])
    data.setdefault("warnings", [])
    data.setdefault("clean_items", [])

    # Clamp arrays to 3 items
    data["red_flags"] = data["red_flags"][:3]
    data["warnings"] = data["warnings"][:3]
    data["clean_items"] = data["clean_items"][:3]

    return data
