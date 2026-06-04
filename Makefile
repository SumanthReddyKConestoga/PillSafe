.PHONY: dev build stop migrate test logs shell-be shell-db lint type-check clean

COMPOSE_DEV = docker compose -f docker/docker-compose.dev.yml
COMPOSE_PROD = docker compose -f docker/docker-compose.yml

# ── Development ──────────────────────────────────────────────────────────────
dev:
	$(COMPOSE_DEV) up

dev-build:
	$(COMPOSE_DEV) up --build

stop:
	$(COMPOSE_DEV) down

# ── Production ───────────────────────────────────────────────────────────────
build:
	$(COMPOSE_PROD) build

up:
	$(COMPOSE_PROD) up -d

down:
	$(COMPOSE_PROD) down

# ── Database ─────────────────────────────────────────────────────────────────
migrate:
	$(COMPOSE_DEV) exec backend alembic upgrade head

migrate-down:
	$(COMPOSE_DEV) exec backend alembic downgrade -1

migrate-gen:
	$(COMPOSE_DEV) exec backend alembic revision --autogenerate -m "$(msg)"

# ── Testing ───────────────────────────────────────────────────────────────────
test:
	$(COMPOSE_DEV) exec backend pytest tests/ -v --tb=short

test-cov:
	$(COMPOSE_DEV) exec backend pytest tests/ -v --cov=app --cov-report=term-missing

# ── Code quality ─────────────────────────────────────────────────────────────
lint:
	$(COMPOSE_DEV) exec backend ruff check app/
	cd frontend && npm run lint

type-check:
	cd frontend && npm run type-check

# ── Utilities ────────────────────────────────────────────────────────────────
logs:
	$(COMPOSE_DEV) logs -f

logs-be:
	$(COMPOSE_DEV) logs -f backend

shell-be:
	$(COMPOSE_DEV) exec backend bash

shell-db:
	$(COMPOSE_DEV) exec postgres psql -U pillsafe_user -d pillsafe

clean:
	$(COMPOSE_DEV) down -v --remove-orphans
	docker system prune -f
