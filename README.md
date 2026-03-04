# PolicyLens

**Know what you're agreeing to.**

The average privacy policy is 4,000 words of dense legal text. A Stanford study found it would take 76 work days per year to read every policy you agree to. Nobody does — and companies know it.

PolicyLens changes that. Select from 27 popular services or paste any URL, and our AI reads the entire policy for you — grading it from A+ to F, surfacing red flags with verbatim quotes, and telling you exactly what to do about it.

No account required. No data stored. Runs entirely in your browser session.

---

## The Problem

Every day, millions of people click "I Agree" without reading a single word. Privacy policies are deliberately long, vague, and full of legal jargon. Users have no practical way to understand what they're consenting to — until now.

## Our Solution

PolicyLens fetches the actual privacy policy text, sends it through Claude AI for structured analysis, and returns a clear, actionable report in seconds. Every finding is backed by a **verbatim quote** from the policy — not a summary, not a paraphrase, but the exact words the company wrote.

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

## Configuration

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `LLM_API_KEY` | Yes | Your LLM provider API key (e.g., Anthropic) |
| `LLM_MODEL` | No | Model identifier (default: `anthropic/claude-haiku-4-5-20251001`) |
| `LLM_BASE_URL` | No | Custom API endpoint for proxies or local models |

---

## Running Locally

**Prerequisites:** Docker and Docker Compose.

```bash
# Clone and configure
git clone <repo-url>
cd t1a_hackathon_team_test
cp .env.example .env   # set LLM_API_KEY

# Build and start
docker compose up --build

# Open the app
open http://localhost:3000
```

```bash
# Stop
docker compose down

# Stop and wipe analysis cache
docker compose down -v
```

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

Built by Test team at the T1A Hackathon, March 4–5, 2026.
