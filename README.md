# PolicyLens

Know what you're agreeing to.

PolicyLens gives you a **digital risk profile** by fetching and analyzing the privacy policies of online services you select. Pick from popular services or paste any URL, and Claude grades each policy from A+ to F — surfacing red flags, warnings, and positives in plain English.

No account required. All state is stored in your browser session.

---

## Architecture

```
Browser (localhost:3000)
    │
    ▼
Next.js 14 frontend          (Docker, port 3000)
    │  /api/* proxy routes
    ▼
FastAPI backend              (Docker, internal port 8000)
    ├── AsyncAnthropic SDK   (policy analysis + URL discovery)
    ├── httpx + BeautifulSoup (privacy policy fetching)
    └── SQLite via SQLAlchemy (analysis cache, volume-mounted)
```

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS |
| Backend | Python 3.11, FastAPI, AsyncAnthropic SDK |
| Database | SQLite (persisted in a Docker volume) |
| AI | Claude claude-haiku-4-5-20251001 (policy grading + URL discovery) |
| Infra | Docker Compose — 2 containers, 1 internal network |

The browser only ever talks to `localhost:3000`. Next.js API routes proxy all requests to the Python backend over Docker's internal network (`http://backend:8000`), so no CORS configuration is needed and the Anthropic API key is never exposed to the client.

Analyses are cached indefinitely in SQLite — re-selecting a previously analyzed service returns the cached result instantly.

---

## Configuration

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

`.env` variables:

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |
| `ANTHROPIC_BASE_URL` | No | Custom API endpoint (defaults to `https://api.anthropic.com`) |

---

## Running locally

**Prerequisites:** Docker and Docker Compose.

```bash
# 1. Clone and enter the repo
git clone <repo-url>
cd t1a_hackathon_team_test

# 2. Configure environment
cp .env.example .env
# edit .env and set ANTHROPIC_API_KEY

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

1. **Select services** — click any card in the grid to toggle selection
2. **Add a custom service** — paste any website URL and click Add; the backend will locate the privacy policy automatically
3. **Analyze** — click "Calculate My Digital Risk Profile"; results appear within ~30 seconds
4. **Review** — each service gets a letter grade (A+ → F), a one-sentence summary, and expandable red flags / warnings / positives
5. **Persist** — selections and results survive page refreshes via `sessionStorage`
