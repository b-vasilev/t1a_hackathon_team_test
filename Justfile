# PolicyLens — run `just` to see commands

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
    rm -f backend/policylens.db data/policylens.db

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

# Run tests
test:
    cd backend && python -m pytest tests/ -v
    cd frontend && npm test

# Format + lint all
check: fmt lint

# Full CI: lint + test + build
ci: lint test
    cd frontend && npm run build
