# PolicyLens

Know what you're agreeing to.

PolicyLens gives you a **digital risk profile** by fetching and analyzing the privacy policies of online services you select. Pick from 27 popular services or paste any URL, and Claude grades each policy from A+ to F — surfacing red flags, warnings, and positives in plain English with verbatim quotes from the policy text.

No account required. All state is stored in your browser session.

---

## Features

- **Privacy Policy Grading** — Each service gets a letter grade (A+ → F) with categorized findings (red flags, warnings, positives), each backed by verbatim quotes from the actual policy text
- **Policy Comparison** — Compare two analyzed policies side-by-side to see how they differ on data collection, sharing, retention, and more
- **Q&A Chat** — Ask natural language questions about any analyzed policy and get answers grounded in the policy text
- **PDF Report Export** — Download a professionally formatted PDF report of your analysis results
- **Actionable Privacy Steps** — "What You Can Do" section with direct links to opt-out pages, privacy settings, and data deletion requests
- **Smart Caching** — Analyses are cached in SQLite; re-selecting a service returns results instantly, with per-service rescan available
- **Category Filters** — Browse services by category (Productivity, Social, Shopping, etc.)
- **Quote Navigation** — Click any finding to jump to and highlight the relevant passage in the full policy text
- **Sudoku Mini-Game** — Optional puzzle to play while waiting for analysis to complete

---

## Architecture

```
Browser (localhost:3000)
    │
    ▼
Next.js 16 frontend          (Docker, port 3000)
    │  /api/* proxy routes
    ▼
FastAPI backend              (Docker, internal port 8000)
    ├── LiteLLM              (provider-agnostic LLM calls)
    ├── httpx + BeautifulSoup (privacy policy fetching)
    ├── Jina AI fallback     (for hard-to-scrape sites)
    └── SQLite via SQLAlchemy (analysis cache, volume-mounted)
```

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS 4 |
| Backend | Python 3.13, FastAPI, LiteLLM |
| Database | SQLite (persisted in a Docker volume) |
| AI | Claude Haiku 4.5 via LiteLLM (policy grading, URL discovery, Q&A chat) |
| PDF Export | @react-pdf/renderer |
| Infra | Docker Compose — 2 containers, 1 internal network |

The browser only ever talks to `localhost:3000`. Next.js API routes proxy all requests to the Python backend over Docker's internal network (`http://backend:8000`), so no CORS configuration is needed and the LLM API key is never exposed to the client.

---

## Configuration

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

`.env` variables:

| Variable | Required | Description |
|---|---|---|
| `LLM_API_KEY` | Yes | Your LLM provider API key (e.g. Anthropic, OpenAI) |
| `LLM_MODEL` | No | Model identifier (defaults to `anthropic/claude-haiku-4-5-20251001`) |
| `LLM_BASE_URL` | No | Custom API endpoint (for proxies or local models) |

---

## Running locally

**Prerequisites:** Docker and Docker Compose.

```bash
# 1. Clone and enter the repo
git clone <repo-url>
cd t1a_hackathon_team_test

# 2. Configure environment
cp .env.example .env
# edit .env and set LLM_API_KEY

# 3. Build and start
docker compose up --build

# 4. Open the app
open http://localhost:3000
```

To stop:

```bash
docker compose down
```

To stop and wipe the analysis cache (SQLite volume):

```bash
docker compose down -v
```

---

## Usage

1. **Select services** — browse by category or click any card in the grid to toggle selection
2. **Add a custom service** — paste any website URL and click Add; the backend will locate the privacy policy automatically
3. **Analyze** — click "Calculate My Digital Risk Profile"; optionally play Sudoku while waiting
4. **Review results** — each service gets a letter grade (A+ → F), a summary, and expandable findings with verbatim quotes; click any finding to jump to the relevant passage in the full policy text
5. **Ask questions** — open the Q&A chat on any analyzed service to ask follow-up questions in natural language
6. **Compare policies** — switch to the Compare tab to view two policies side-by-side
7. **Take action** — check the "What You Can Do" section for direct links to privacy settings, opt-outs, and data deletion
8. **Export** — download a PDF report of your analysis results
9. **Rescan** — clear the cache for any service to re-analyze with fresh data

---

## Testing

```bash
# Run all tests (backend + frontend)
just test

# Backend tests with coverage
cd backend && python -m pytest app/ -v --cov=app --cov-report=term-missing

# Frontend tests
cd frontend && npm test
```

Coverage threshold: **70% line coverage** for both backend and frontend.
