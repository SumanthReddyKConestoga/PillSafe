# PillSafe

**AI-powered medication safety for patients who deserve to understand their prescriptions.**

PillSafe is a multi-modal medication analysis application built as part of the Conestoga College Graduate AI/ML program. It uses computer vision, natural language processing, and generative AI to help elderly, low-literacy, and visually impaired patients safely identify their medications and understand their prescription labels.

> **Decision Support Only** — PillSafe does not provide medical advice. Always confirm medication information with a licensed pharmacist or physician.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Browser (React 18 + Vite)                                              │
│  LoginPage  RegisterPage  DashboardShell  AnalyzePage                  │
└────────────────────────────┬────────────────────────────────────────────┘
                             │ HTTPS
                             ▼
┌────────────────────────────────────────────────────────────────────────┐
│  Nginx (reverse proxy)                                                  │
│  /api/* → FastAPI backend   /  → React SPA static build               │
└────────────────┬───────────────────────────────────────────────────────┘
                 │
    ┌────────────▼────────────┐
    │  FastAPI (Python 3.11)  │
    │  /api/v1/auth           │◄──── JWT + httpOnly refresh cookie
    │  /api/v1/patients       │◄──── Bearer token auth
    │  /api/v1/analyze  ──────┼────► ML Pipeline (Sprint 4)
    │  /health                │         │
    └────────┬────────┬───────┘         │
             │        │           ┌─────▼──────────────────────────┐
    ┌────────▼──┐  ┌──▼───────┐  │  YOLOv8   Pill segmentation    │
    │PostgreSQL │  │  Redis   │  │  CNN+FAISS Pill identification  │
    │  Users    │  │ Token    │  │  NER       Label parsing        │
    │  Patients │  │ blacklist│  │  LLM       Guidance synthesis   │
    └───────────┘  └──────────┘  └────────────────────────────────┘
```

---

## Tech Stack

| Layer        | Technology                                      |
|--------------|-------------------------------------------------|
| Frontend     | React 18, TypeScript, Vite, TailwindCSS v3      |
| State mgmt   | Zustand (with localStorage persistence)         |
| Forms        | React Hook Form + Zod                           |
| HTTP client  | Axios (with silent token refresh interceptor)   |
| Backend      | FastAPI, Python 3.11, async/await throughout    |
| ORM          | SQLAlchemy 2.x async + asyncpg                  |
| Migrations   | Alembic                                         |
| Auth         | JWT (HS256), bcrypt cost-12, httpOnly cookies   |
| Cache        | Redis 7 (token blacklist, rate limiting)        |
| Database     | PostgreSQL 15                                   |
| ML — Vision  | YOLOv8 segmentation, CNN + FAISS retrieval      |
| ML — NLP     | NER label parser (drug name, dosage, frequency) |
| ML — Gen AI  | LLM guidance synthesis (Claude via API)         |
| Container    | Docker, Docker Compose, Nginx                   |
| CI/CD        | GitHub Actions                                  |

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 24+
- [Node.js](https://nodejs.org/) 20+ (for local frontend dev without Docker)
- [Python](https://www.python.org/) 3.11+ (for local backend dev without Docker)
- [Make](https://www.gnu.org/software/make/) (Windows: via WSL, Chocolatey, or Git Bash)

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-org/pillsafe.git
cd pillsafe

# 2. Copy and configure environment variables
cp .env.example .env
# Edit .env — at minimum change SECRET_KEY and POSTGRES_PASSWORD

# 3. Start the full development stack
make dev

# 4. Run database migrations (first time only)
make migrate

# 5. Open the application
#    Frontend:  http://localhost:5173
#    API docs:  http://localhost:8000/docs
#    Health:    http://localhost:8000/health
```

---

## Environment Variables

| Variable                    | Description                                              | Example                                        |
|-----------------------------|----------------------------------------------------------|------------------------------------------------|
| `APP_ENV`                   | Runtime environment (`development` / `production`)       | `development`                                  |
| `APP_VERSION`               | Application version string                               | `0.1.0`                                        |
| `SECRET_KEY`                | 256-bit secret for JWT signing — **change in prod**      | `openssl rand -hex 32`                         |
| `ALGORITHM`                 | JWT signing algorithm                                    | `HS256`                                        |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token TTL in minutes                            | `15`                                           |
| `REFRESH_TOKEN_EXPIRE_DAYS`  | Refresh token TTL in days                               | `7`                                            |
| `POSTGRES_HOST`             | PostgreSQL hostname (Docker service name in containers)  | `postgres`                                     |
| `POSTGRES_PORT`             | PostgreSQL port                                          | `5432`                                         |
| `POSTGRES_DB`               | Database name                                            | `pillsafe`                                     |
| `POSTGRES_USER`             | Database user                                            | `pillsafe_user`                                |
| `POSTGRES_PASSWORD`         | Database password — **change in prod**                   | `change_me`                                    |
| `DATABASE_URL`              | Full async SQLAlchemy connection string                  | `postgresql+asyncpg://user:pass@host:5432/db`  |
| `REDIS_URL`                 | Redis connection URL                                     | `redis://redis:6379/0`                         |
| `FRONTEND_ORIGIN`           | Allowed CORS origin for the React dev server             | `http://localhost:5173`                        |
| `AUTH_RATE_LIMIT`           | Rate limit on auth endpoints per IP                      | `10/minute`                                    |
| `OPENAPI_ENABLED`           | Expose `/docs` and `/redoc` endpoints                    | `true` (set `false` in production)             |
| `ML_PIPELINE_ENABLED`       | Gate for Sprint 4 ML pipeline                            | `false`                                        |
| `LLM_API_KEY`               | Anthropic API key (Sprint 6)                             | *(leave blank until Sprint 6)*                 |
| `LLM_MODEL`                 | Claude model for guidance synthesis                      | `claude-sonnet-4-20250514`                     |

---

## API Reference

All endpoints are under `/api/v1/`. Protected routes require `Authorization: Bearer <access_token>`.

| Method  | Path                    | Auth     | Description                                      |
|---------|-------------------------|----------|--------------------------------------------------|
| `POST`  | `/auth/register`        | No       | Create user + patient profile, return token pair |
| `POST`  | `/auth/login`           | No       | Validate credentials, return token pair          |
| `POST`  | `/auth/logout`          | Bearer   | Blacklist access token in Redis                  |
| `POST`  | `/auth/refresh`         | Cookie   | Rotate refresh token, return new access token    |
| `GET`   | `/auth/me`              | Bearer   | Return current user + patient name               |
| `GET`   | `/patients/me`          | Bearer   | Return full patient profile                      |
| `PATCH` | `/patients/me`          | Bearer   | Update patient profile fields                    |
| `POST`  | `/analyze`              | Bearer   | Analyze medication image (stub until Sprint 4)   |
| `GET`   | `/health`               | No       | Service health: DB + Redis status                |

**Error envelope** — all errors use this consistent shape:
```json
{
  "detail": {
    "error": {
      "code": "EMAIL_TAKEN",
      "message": "An account with this email already exists.",
      "details": {}
    }
  }
}
```

---

## Project Structure

```
pillsafe/
├── backend/                    FastAPI application
│   ├── app/
│   │   ├── api/v1/routes/      auth.py · patients.py · analyze.py
│   │   ├── core/               config · security · database · redis
│   │   ├── models/             User · Patient (SQLAlchemy ORM)
│   │   ├── schemas/            Pydantic v2 request/response models
│   │   ├── services/           auth_service · patient_service
│   │   └── main.py             FastAPI factory, CORS, middleware
│   ├── migrations/             Alembic versions
│   └── tests/                  pytest + httpx async tests
├── frontend/                   React 18 + Vite + TypeScript
│   └── src/
│       ├── api/                client.ts (axios + refresh) · auth.ts
│       ├── components/         ui (Button/Input/Card/Alert) · layout
│       ├── pages/              LoginPage · RegisterPage · DashboardPage
│       ├── store/              authStore (Zustand + persist)
│       ├── router/             Protected route wrapper
│       └── types/              User · AuthState · ApiError
├── docker/                     docker-compose.yml · nginx config
├── .github/workflows/          CI: lint + type-check + test
├── Makefile                    make dev / test / migrate / logs
└── .env.example                All environment variables documented
```

---

## ML Pipeline (Sprint 4+)

The `/api/v1/analyze` endpoint currently returns a **stub response** with demo data. In Sprint 4, the real pipeline will be wired in:

| Stage              | Model / Tool            | Output                                        |
|--------------------|-------------------------|-----------------------------------------------|
| 1. Segmentation    | YOLOv8 (custom-trained) | Bounding boxes around pills and label regions |
| 2. Identification  | CNN + FAISS ANN index   | Top-k pill matches with confidence scores     |
| 3. Label Parsing   | Named Entity Recognition| Drug name, dosage, frequency, expiry          |
| 4. Guidance        | LLM (Claude API)        | Plain-language patient guidance               |

The `ML_PIPELINE_ENABLED=false` feature flag lets the application run and demo fully without the models loaded.

---

## Ethics & Compliance

- **PIPEDA / PHIPA stance**: No prescription images or personal health data are stored beyond the session. Only aggregated counters (`medications_analyzed`) are persisted.
- **Decision support framing**: All UI copy explicitly states this is a decision support tool, not a replacement for medical advice.
- **Accessibility**: WCAG 2.1 AA colour contrast, labelled form inputs, keyboard navigation, screen-reader-friendly ARIA attributes throughout.
- **No dark patterns**: No pre-checked marketing consent, no confusing data-sharing flows.

---

## Contributing

**Branch naming:** `feat/<short-description>` · `fix/<issue>` · `chore/<task>`

**Commit messages:** [Conventional Commits](https://www.conventionalcommits.org/)
```
feat(auth): add refresh token rotation
fix(ui): fix floating label alignment on iOS
chore(deps): bump fastapi to 0.115.5
```

**PR process:**
1. Branch from `develop`
2. Open a draft PR early for visibility
3. Add tests for new backend behaviour
4. Request review from at least one teammate
5. Squash merge into `develop`; merge `develop` → `main` for releases

---

## Team

| Name          | Role                        | GitHub          |
|---------------|-----------------------------|-----------------|
| *(Member 1)*  | ML Lead — Vision pipeline   | @username       |
| *(Member 2)*  | ML Lead — NLP & LLM         | @username       |
| *(Member 3)*  | Backend & DevOps            | @username       |
| *(Member 4)*  | Frontend & UX               | @username       |

---

*PillSafe · Conestoga College Graduate AI/ML Program · AIML-6900 Capstone*
