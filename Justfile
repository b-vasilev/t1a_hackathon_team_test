# PrivacyLens — run `just` to see commands

default:
    @just --list

# Build and start all containers
up:
    docker compose up --build

# Stop containers
stop:
    docker compose down

# Stop and wipe SQLite cache
reset:
    docker compose down -v

# Remove local SQLite database
remove-db:
    rm -f backend/privacylens.db data/privacylens.db

# Install all deps locally
install:
    cd backend && pip install -e ".[dev]"
    cd frontend && npm install

# Lint all
lint:
    cd backend && python -m ruff check app/
    cd frontend && npx eslint .

# Format all
fmt:
    cd backend && python -m ruff format app/

# Run tests with coverage thresholds (70% line coverage)
test:
    cd backend && python -m pytest tests/ -v --cov=app --cov-report=term-missing --cov-fail-under=70
    cd frontend && npx vitest run --coverage --coverage.thresholds.lines=70

# Format + lint all
check: fmt lint

# Build frontend
build:
    cd frontend && npm run build

# Full CI: check + test + build
ci: check test build
