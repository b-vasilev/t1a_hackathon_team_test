# PrivacyLens

**Know what you're agreeing to.**

The average privacy policy is 4,000 words of dense legal text. A Stanford study found it would take 76 work days per year to read every policy you agree to. Nobody does — and companies know it.

PrivacyLens changes that. Select from 27 popular services or paste any URL, and our AI reads the entire policy for you — grading it from A+ to F, surfacing red flags with verbatim quotes, and telling you exactly what to do about it.

No account required. No data stored. Runs entirely in your browser session.

**Live app:** [https://privacylens.app](https://privacylens.app/) — no setup required.

---

## The Problem

Every day, millions of people click "I Agree" without reading a single word. Privacy policies are deliberately long, vague, and full of legal jargon. Users have no practical way to understand what they're consenting to — until now.

> **Why this matters at T1A:** Before onboarding any third-party vendor or SaaS tool, someone has to review their privacy policy. PrivacyLens turns a manual, hour-long legal review into a 30-second automated audit — surfacing exactly what data is collected, shared, and retained, with direct quotes as evidence.

## Our Solution

PrivacyLens fetches the actual privacy policy text, sends it through Claude AI for structured analysis, and returns a clear, actionable report in seconds. Every finding is backed by a **verbatim quote** from the policy — not a summary, not a paraphrase, but the exact words the company wrote.

---

## Key Features

### Core Analysis
- **AI-Powered Grading (A+ → F)** — Each policy is scored across 5 categories: Data Collection, Data Sharing, Data Retention, Tracking & Cookies, and User Rights. The overall grade reflects real risk, not just word count.
- **Verbatim Quote Evidence** — Every red flag, warning, and positive finding includes the exact quote from the policy. Click any finding to jump to and highlight that passage in the full text.
- **27 Pre-Seeded Popular Services** — Google, TikTok, Instagram, Discord, ChatGPT, Spotify, and 21 more — ready to analyze instantly.
- **Custom URL Support** — Paste any website URL. The AI automatically discovers and fetches the privacy policy, even if it's buried three clicks deep.

### Deeper Understanding
- **Q&A Chat** — Ask follow-up questions about any analyzed policy in natural language. Answers are grounded in the actual policy text, not general knowledge.
- **Side-by-Side Comparison** — Compare two policies to see exactly how they differ on data collection, sharing, retention, and user rights.
- **Full Policy Viewer** — Read the complete policy text with section navigation, search, and finding highlights.

### Take Action
- **"What You Can Do" Steps** — Every analysis includes direct links to the service's privacy settings, data deletion page, account deletion, data export, and opt-out options.
- **PDF Report Export** — Download a professionally formatted report to share with colleagues, clients, or regulators.

### Technical Excellence
- **Smart Caching** — Analyses are cached in SQLite with a 7-day TTL. Re-selecting a service returns instant results. Per-service rescan is available.
- **4-Fallback Fetch Strategy** — Direct fetch → Jina AI (JavaScript rendering) → Google Cache → Wayback Machine. If the policy exists online, we'll find it.
- **Concurrent Analysis** — Multiple services analyzed in parallel via `asyncio.gather()`, with deduplication when services share the same policy URL.
- **Rate Limiting** — 60 requests/minute to prevent abuse, configurable via environment variable.
- **Resilient Fallback** — Pre-built analyses for core services when the LLM API is unavailable.

---

## What Sets Us Apart

Most privacy policy tools (like TL;DR Privacy or ToS;DR) give you a static summary or a simple thumbs-up/thumbs-down rating. PrivacyLens goes further:

- **Structured grading, not just a label** — 5 category scores (A+ to F) with weighted GPA averaging, so you see exactly *where* a policy is strong or weak.
- **Verbatim evidence** — Every finding links to the exact quote in the policy. Click it, see it highlighted in the full text. No "trust us" summaries.
- **Interactive Q&A** — Ask follow-up questions ("Can they sell my data?") and get answers grounded in the actual policy, not generic advice.
- **Actionable steps** — Direct links to delete your account, download your data, or change privacy settings — discovered automatically via web search.
- **Any URL, any policy** — Not limited to a fixed database. Paste any URL and the AI finds the privacy policy automatically.
- **Side-by-side comparison** — Compare services head-to-head across all 5 categories to make informed choices.
- **Resilient fetching** — 4-layer fallback (direct → Jina AI → Google Cache → Wayback Machine) means we can read policies that block other tools.
- **Shareable reports** — Export PDF reports or share a direct link to any analysis with your team or compliance reviewers.

---

## Architecture

```
Browser (localhost:3000)
    │
    ▼
Next.js 16 frontend              (Docker, port 3000)
    │  /api/* proxy routes
    ▼
FastAPI backend                  (Docker, internal port 8000)
    ├── Claude Haiku 4.5          (via LiteLLM — provider-agnostic)
    │   ├── Policy grading         (structured JSON output)
    │   ├── Privacy policy URL     (auto-discovery from any website)
    │   └── Q&A chat               (context-aware, grounded in policy text)
    ├── httpx + BeautifulSoup      (policy fetching + text extraction)
    ├── Jina AI Reader             (JavaScript-rendered page fallback)
    └── SQLite via SQLAlchemy      (async, volume-mounted analysis cache)
```

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| Backend | Python 3.13, FastAPI, LiteLLM |
| Database | SQLite (async via aiosqlite, persisted in Docker volume) |
| AI | Claude Haiku 4.5 via LiteLLM |
| PDF Export | @react-pdf/renderer |
| Infrastructure | Docker Compose — 2 containers, 1 internal network |

**Security:** The browser only talks to `localhost:3000`. All LLM API calls are proxied through Next.js API routes over Docker's internal network, so the API key is never exposed to the client. No user data is stored server-side — all client state lives in `sessionStorage`.

---

## How It Works

1. **User selects services** — from a categorized grid (Social, Messaging, Productivity, Streaming, Shopping & Finance) or by pasting a custom URL.
2. **Backend fetches the policy** — tries 4 methods in sequence until it gets the full text. Extracts structured sections from HTML.
3. **AI analyzes the text** — Claude reads the full policy (up to 80K characters) and returns a structured JSON response: grade, category scores, findings with verbatim quotes, and a plain-English summary.
4. **Results are cached** — SHA-256 content hashing deduplicates policies. Multiple services pointing to the same policy share one analysis.
5. **User explores results** — grade overview, expandable findings with quote navigation, Q&A chat, side-by-side comparison, and actionable privacy steps.

---

## Innovation Highlights

- **Quote Validation** — The system verifies that every finding quote exists word-for-word in the policy text, ensuring accuracy and traceability.
- **Auto Policy Discovery** — Given just a website URL (e.g., `spotify.com`), the AI finds and fetches the privacy policy URL automatically — no manual searching required.
- **Content-Hash Deduplication** — Services sharing the same privacy policy (e.g., multiple Google products) are detected via SHA-256 hashing and share a single analysis, saving LLM calls and storage.
- **Structured Section Indexing** — Policy text is parsed into navigable sections, enabling the chat feature to select relevant context and the viewer to support jump-to-highlight navigation.

---

## Status

### What's Working
- Full end-to-end analysis pipeline: select a service → fetch policy → AI grading → results display
- All 27 pre-seeded services analyzed and cached
- Custom URL input with automatic privacy policy discovery
- Q&A chat grounded in policy text
- Side-by-side policy comparison
- Full policy viewer with quote highlighting and section navigation
- PDF report export
- 4-fallback fetch strategy (direct → Jina AI → Google Cache → Wayback Machine)
- Smart caching with 7-day TTL and per-service rescan
- 70%+ test coverage on both backend and frontend

### What's Next
- **Policy change tracking** — Monitor services over time, detect when a privacy policy changes, and highlight exactly what's different between versions.
- **Dependency privacy audit** — Scan a project's dependency tree (e.g., `package.json`, `requirements.txt`) and automatically analyze the privacy policy of every third-party service and SDK your codebase depends on. Surface hidden data collection risks before they ship to production.

---

## Running Locally

**Prerequisites:** Docker and Docker Compose.

```bash
git clone <repo-url>
cd t1a_hackathon_team_test
cp .env.example .env
docker compose up --build
```

**Environment variables (`.env`):**

| Variable | Required | Default | Description |
|---|---|---|---|
| `LLM_API_KEY` | Yes | — | LLM provider API key (e.g., Anthropic) |
| `LLM_MODEL` | No | `anthropic/claude-haiku-4-5-20251001` | Model identifier |
| `APP_PORT` | No | `3000` | Frontend port |
| `LLM_BASE_URL` | No | — | Custom API endpoint for proxies or local models |
| `LOG_LEVEL` | No | `INFO` | `DEBUG` / `INFO` / `WARNING` / `ERROR` |

---

## Testing

```bash
# Run all tests (backend + frontend)
just test

# Backend tests with coverage
cd backend && python -m pytest tests/ -v --cov=app --cov-report=term-missing

# Frontend tests
cd frontend && npm test
```

**Coverage threshold:** 70% line coverage for both backend and frontend.

**Test stack:**
- Backend: pytest + pytest-asyncio + unittest.mock (async mocks, no real API calls)
- Frontend: Vitest + React Testing Library + jsdom (component + integration tests)

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app — all API endpoints
│   │   ├── analyzer.py      # Policy fetching, LLM analysis, Q&A chat
│   │   ├── prompts.py       # LLM prompt templates
│   │   ├── models.py        # SQLAlchemy models (Service, PolicyText, PolicyAnalysis)
│   │   ├── database.py      # Async SQLite setup
│   │   ├── seed.py          # 27 pre-seeded popular services
│   │   └── mock_data.py     # Fallback analyses when LLM unavailable
│   └── tests/               # 10 test files, ~60 tests
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.jsx     # Main landing page
│   │   │   ├── layout.jsx   # Global layout + metadata
│   │   │   └── api/         # Next.js proxy routes → backend
│   │   └── components/
│   │       ├── ServiceGrid.jsx      # Categorized service selection
│   │       ├── RiskProfile.jsx      # Analysis results display
│   │       ├── PolicyChat.jsx       # Q&A chat modal
│   │       ├── PolicyViewer.jsx     # Full policy text viewer
│   │       ├── CompareTab.jsx       # Policy comparison selector
│   │       ├── CompareResults.jsx   # Side-by-side comparison
│   │       ├── AddService.jsx       # Custom URL input
│   │       └── pdf/                 # PDF report generation
│   └── tests/               # 9 test files, ~40 tests
├── docker-compose.yml        # 2 services, health checks, volume
├── Justfile                  # Task runner (up, test, lint, fmt, check)
└── .env.example              # Environment template
```

---

## Team

Built by Test team at the T1A Vibe Coding Hackathon (LLM-powered development), March 4–5, 2026.
