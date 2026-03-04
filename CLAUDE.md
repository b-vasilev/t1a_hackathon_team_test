# CLAUDE.md

This file provides guidance to Claude Code when working with the PrivacyLens hackathon project.

## Project Overview

**PrivacyLens** — "Know what you're agreeing to." Fetches and analyzes privacy policies of online services using Claude AI. Users select popular services or paste any URL, and the app grades each policy from A+ to F, surfacing red flags, warnings, and positives in plain English.

No account required. All client state lives in `sessionStorage`.

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
    └── SQLite via SQLAlchemy (analysis cache, volume-mounted)
```

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), Tailwind CSS 4, React 19 |
| Backend | Python 3.13, FastAPI, LiteLLM |
| Database | SQLite (persisted in Docker volume) |
| AI | Claude Haiku 4.5 via LiteLLM (policy grading + URL discovery) |
| Infra | Docker Compose — 2 containers, 1 internal network |

### Key Files

| File | Purpose |
|------|---------|
| `backend/app/main.py` | FastAPI app, all API endpoints |
| `backend/app/analyzer.py` | LiteLLM integration, policy fetching & grading |
| `backend/app/prompts.py` | LLM prompt templates for analysis & URL discovery |
| `backend/app/models.py` | SQLAlchemy models (Service, PolicyAnalysis) |
| `backend/app/database.py` | Async SQLite setup |
| `backend/app/seed.py` | Pre-populated popular services |
| `frontend/src/app/page.js` | Main page component |
| `frontend/src/components/ServiceGrid.js` | Service selection grid |
| `frontend/src/components/AddService.js` | Custom URL input |
| `frontend/src/components/RiskProfile.js` | Analysis results display |
| `frontend/src/app/api/*/route.js` | Next.js API proxy routes |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/services` | GET | List popular services |
| `/api/services/custom` | POST | Add custom service by URL |
| `/api/analyze` | POST | Analyze selected services |

## Hackathon Context

T1A First Hackathon — March 4–5, 2026. Projects judged March 6 by 3 human judges + 1 LLM judge.

### Scoring Rubric (0–10 each, max 40 per judge)

1. **Solution Quality** — working solution, robustness, completeness
2. **Idea / Innovation** — strength/novelty of approach, clarity of concept
3. **Real-world Usefulness** — how much this helps in the real world or at T1A
4. **Presentation Quality** — clarity, demo quality, time management, Q&A handling

Tie-breaker order: Real-world Usefulness → Solution Quality → judge vote.

### Maximize Score Rule

**Every implementation decision MUST optimize for the scoring rubric above.** When choosing between approaches, always pick the one that:
- Makes the solution more **complete and robust** (Solution Quality)
- Adds **novel or clever** capabilities (Innovation)
- Delivers **practical, tangible value** (Real-world Usefulness)
- Will **demo well** in a 10-min live presentation (Presentation Quality)

### Constraints

- Any languages/frameworks/providers allowed
- No client data — use public/synthetic data only
- Prioritize working code over perfect code — ship features fast, polish later
- Use 2026 in web searches

## Mandatory Rules

- **NEVER read .env file** — Contains the LLM API key. Do not read, open, or access `.env` under any circumstances.
- **Never commit changes without confirmation from the user** — Always ask before running `git commit`.
- **Never delete files not tracked by git without confirmation from user**
- **Never run backend or frontend servers** — You can build, but ask user to run `docker compose up`.
- **Before making any changes, outline your plan in 3-5 bullet points.** Include which files you'll change and why. Wait for approval before proceeding.
- **Always create a task list for multi-step work** — When a task involves more than 2 actions, create a task list using the TaskCreate tool.
- **Re-read implementation plan after each phase** — When implementing a multi-phase plan, MANDATORY: after completing each phase, re-read the plan file to ensure you haven't deviated.
- Never set yourself as the git commit author. Do not add a "Co-Authored-By" trailer to commit messages.
- When asked to find a file, always start with `find . -name '<filename>' -maxdepth 3` or `ls` in the project root before claiming a file doesn't exist.
- **Always search project root first** — When looking for project-level files, check the project root directory first with a direct path.
- **Always run `just check` after code changes** — This runs both formatter (`ruff format`) and linter (`ruff check` + ESLint) in one command. Fix any issues before committing.

## Running the App

```bash
# First time
cp .env.example .env   # fill in LLM_API_KEY
docker compose up --build

# Subsequent runs
docker compose up

# Stop
docker compose down

# Stop + wipe cache
docker compose down -v
```

## Testing

### Commands

```bash
# Run all tests (backend + frontend)
just test

# Backend tests with coverage
cd backend && python -m pytest app/ -v --cov=app --cov-report=term-missing

# Frontend tests
cd frontend && npm test

# Frontend tests in watch mode
cd frontend && npm run test:watch
```

### Coverage Thresholds

- **Backend: 70% line coverage** — enforce with `--cov-fail-under=70`
- **Frontend: 70% line coverage** — enforce with `vitest run --coverage --coverage.thresholds.lines=70`
- Always run `just test` after writing or modifying code
- When adding new features, write tests alongside the implementation
- Mock external dependencies (LiteLLM calls, HTTP fetching, `fetch()`) — never make real API calls in tests
- Place backend tests in `backend/tests/` using the `test_*.py` naming convention
- Place frontend tests next to their source files as `ComponentName.test.js` or in `__tests__/` directories
- Frontend stack: **Vitest + React Testing Library + jsdom** (`frontend/vitest.config.js`)

## Code Review Pipeline

After completing each feature or code change, run a code review:
1. **REVIEW**: Create a subagent to review all changed files vs main branch. Output findings as structured markdown with severity (H/M/L), file path, line number, and description.
2. **TRIAGE**: Auto-skip L-severity cosmetic issues. For H and M findings, write a fix plan.
3. **FIX**: For each file with findings, apply fixes and verify they work.
4. **VERIFY**: Run `docker compose build` to verify the build succeeds. Loop up to 3 times on failure.

Do NOT ask for confirmation at any step. If you can't find a file, list the directory first.

## Code Simplifier

If user asks to run the code simplifier, use the `code-simplifier:code-simplifier` agent. Provide this instruction: "When updating or removing comments from code, do it in batch/most effective way (multiple edits per file, multiple files at once)."