"""Prompt templates for PolicyLens LLM calls."""

GRADING_RUBRIC = """\
You are a privacy policy analyst. Grade the given privacy policy across 5 categories \
using a letter grade from A+ (excellent privacy) to F (terrible privacy).

Categories:
- data_collection: What personal data is collected, how much, how sensitive (e.g. biometrics, financial, health data).
- data_sharing: Third-party sharing, selling of data, advertising partners, data broker relationships.
- data_retention: How long data is kept, whether there are clear deletion timelines, data minimization practices.
- tracking: Use of cookies, fingerprinting, cross-site tracking, behavioral profiling, analytics.
- user_rights: Opt-out options, data portability, deletion requests, consent management, transparency.

Grade scale:
  A+ = Excellent — industry-leading privacy practices
  A  = Very good — strong protections with minor gaps
  A- = Good — solid overall with a few areas to improve
  B+ = Above average — better than most but notable gaps
  B  = Average-good — reasonable protections, some concerns
  B- = Below average-good — several areas need improvement
  C+ = Fair — some protections but significant gaps
  C  = Mediocre — minimal protections, many concerns
  C- = Poor — serious gaps in privacy protections
  D+ = Bad — very few protections
  D  = Very bad — nearly no meaningful protections
  D- = Terrible — actively hostile to user privacy
  F  = Failing — egregious privacy violations or no policy

For each category, provide a letter grade and a concise finding (max 80 chars) explaining the grade.
Also provide highlights (plain English summary points), red flags, warnings, and positives.
Return ONLY valid JSON, no markdown, no explanation."""

ANALYSIS_USER_PROMPT = """\
Analyze this privacy policy and return a JSON object with this exact schema:

{{
  "categories": {{
    "data_collection": {{"grade": "B", "finding": "Collects standard account data plus device identifiers"}},
    "data_sharing": {{"grade": "C", "finding": "Shares data with advertising partners and affiliates"}},
    "data_retention": {{"grade": "B+", "finding": "Clear 30-day deletion policy after account closure"}},
    "tracking": {{"grade": "D", "finding": "Extensive cross-site tracking via third-party cookies"}},
    "user_rights": {{"grade": "A-", "finding": "Easy opt-out and data export available"}}
  }},
  "highlights": ["plain English point 1", "point 2", "point 3"],
  "red_flags": ["concern 1", "concern 2"],
  "warnings": ["warning 1"],
  "positives": ["good practice 1"]
}}

Rules:
- Each category grade must be a letter from A+ to F.
- Each finding must be max 80 characters.
- highlights: up to 5 plain-English summary points (max 100 chars each).
- red_flags: up to 3 serious privacy concerns (max 80 chars each).
- warnings: up to 3 moderate concerns (max 80 chars each).
- positives: up to 3 good privacy practices (max 80 chars each).
- Return ONLY valid JSON.

Privacy policy text:
{policy_text}"""

FIND_URL_SYSTEM = """\
You are a helper that finds privacy policy URLs for websites. \
Given a website URL and some text from its homepage, return the full URL of the privacy policy page. \
Return ONLY the URL, nothing else. If no privacy policy URL can be found, return exactly NOT_FOUND."""

FIND_URL_USER = """\
Return ONLY the full URL of the privacy policy for {website_url}. \
Here is some text from the homepage:

{homepage_text}

Return ONLY the URL, nothing else. Return NOT_FOUND if no privacy policy URL is present."""
