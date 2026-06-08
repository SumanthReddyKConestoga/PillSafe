# PillSafe — Project Progress Document

**Course:** HLTH 4892 Capstone  
**Student:** Sumanth  
**Last Updated:** 2026-06-08  
**Repository:** https://github.com/SumanthReddyKConestoga/PillSafe  
**Branch:** `main`

---

## What Is PillSafe?

PillSafe is a medication safety web application that lets patients photograph their pill bottles and loose pills. The system uses a computer-vision ML pipeline to identify the pills, read the prescription label, and return plain-language guidance plus safety alerts — helping patients verify they are taking the right medication at the right dose.

---

## Current Project Status

| Area | Status |
|------|--------|
| Folder structure | Finalised and stable |
| Backend API (FastAPI) | Auth + Patients + Analyze + Admin — fully working |
| Frontend UI (React 18) | Light theme, i18n (EN/FR), all pages complete |
| RBAC (Role-Based Access Control) | ADMIN / PATIENT roles enforced front + back |
| Admin pages | AdminDashboard + AdminUsers — fully wired |
| Database (SQLite) | Code-first, auto-created on startup, Analysis table added |
| Swagger UI | Enabled at `/docs` with auth instructions + persist token |
| Dev seed endpoint | `POST /api/v1/dev/seed-admin` to bootstrap first admin |
| CI Pipeline (GitHub Actions) | Backend tests pass, frontend builds |
| ML Pipeline | Stub endpoint in place (Sprint 4 work) |
| Docker / Redis | Not used — SQLite only, no containers |

---

## Folder Structure

```
PillSafe_FINAL/
├── dev/
│   ├── backend/                  ← FastAPI + SQLAlchemy + SQLite
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── deps.py           get_current_user, get_current_admin
│   │   │   │   └── v1/
│   │   │   │       ├── router.py     mounts auth, patients, analyze, admin, dev
│   │   │   │       └── routes/
│   │   │   │           ├── auth.py       register/login/logout/refresh/me
│   │   │   │           ├── patients.py   patient profile CRUD
│   │   │   │           ├── analyze.py    image upload + analysis (DB-persisted)
│   │   │   │           ├── admin.py      stats, users CRUD, analyses audit
│   │   │   │           └── dev.py        seed-admin (dev only, 404 in prod)
│   │   │   ├── core/
│   │   │   │   ├── config.py     pydantic-settings, reads .env
│   │   │   │   ├── database.py   async SQLite engine + get_db + init_db
│   │   │   │   └── security.py   JWT sign/verify, bcrypt hashing
│   │   │   ├── models/
│   │   │   │   ├── user.py       User ORM (UUID PK, PATIENT/ADMIN role)
│   │   │   │   ├── patient.py    Patient ORM (1:1 to User)
│   │   │   │   └── analysis.py   Analysis ORM (FK to User, status, guidance)
│   │   │   ├── schemas/
│   │   │   │   ├── auth.py       Register/Login/Token/Me schemas
│   │   │   │   ├── patient.py    PatientCreate/Update/Out
│   │   │   │   └── admin.py      AdminUser, PlatformStats, AnalysisSummary
│   │   │   ├── services/
│   │   │   │   ├── auth_service.py
│   │   │   │   ├── patient_service.py
│   │   │   │   └── admin_service.py
│   │   │   └── main.py           FastAPI factory, Swagger, CORS, /health
│   │   ├── tests/
│   │   │   ├── conftest.py
│   │   │   └── test_health.py
│   │   ├── pytest.ini
│   │   └── requirements.txt
│   └── frontend/                 ← React 18 + TypeScript + Tailwind CSS
│       ├── src/
│       │   ├── api/
│       │   │   ├── client.ts     axios, auto-attach JWT
│       │   │   ├── auth.ts       login/register/logout/me
│       │   │   └── admin.ts      adminApi — stats, users, analyses
│       │   ├── components/
│       │   │   ├── layout/
│       │   │   │   ├── AppShell.tsx
│       │   │   │   ├── Sidebar.tsx    nav links + admin section
│       │   │   │   └── Topbar.tsx     user menu + logout
│       │   │   └── ui/
│       │   │       ├── LanguageSwitcher.tsx   EN/FR toggle
│       │   │       ├── Button.tsx
│       │   │       ├── Card.tsx
│       │   │       ├── Input.tsx
│       │   │       └── Alert.tsx
│       │   ├── i18n/
│       │   │   ├── index.ts          i18next init, localStorage persist
│       │   │   └── locales/
│       │   │       ├── en.json       English strings
│       │   │       └── fr.json       French strings
│       │   ├── pages/
│       │   │   ├── auth/
│       │   │   │   ├── LoginPage.tsx      light theme + i18n
│       │   │   │   └── RegisterPage.tsx   light theme + i18n
│       │   │   ├── dashboard/
│       │   │   │   ├── DashboardPage.tsx  stats, quick actions, schedule
│       │   │   │   └── AnalyzePage.tsx    drag-drop upload, results
│       │   │   ├── admin/
│       │   │   │   ├── AdminDashboardPage.tsx  platform stats + recent analyses
│       │   │   │   └── AdminUsersPage.tsx       user table + activate/role/delete
│       │   │   └── NotFoundPage.tsx
│       │   ├── router/index.tsx   RequireAuth + RequireAdmin guards
│       │   ├── store/authStore.ts  Zustand persist (user + token)
│       │   └── styles/globals.css  light theme CSS vars + Tailwind base
│       ├── tailwind.config.ts     teal palette + bg-brand-hero gradient
│       ├── tsconfig.json          ignoreDeprecations: "5.0"
│       └── vite.config.ts         /api proxy → localhost:8000
```

---

## Technology Stack

### Backend
| Package | Version | Purpose |
|---------|---------|---------|
| FastAPI | 0.115.5 | Web framework |
| Uvicorn | 0.32.1 | ASGI server |
| SQLAlchemy | 2.0.36 | ORM (async, code-first) |
| aiosqlite | 0.20.0 | Async SQLite driver |
| python-jose | 3.3.0 | JWT signing / verification |
| passlib | 1.7.4 | Password hashing (bcrypt wrapper) |
| **bcrypt** | **4.0.1** | **PINNED — passlib incompatible with bcrypt 5.x** |
| pydantic | 2.10.3 | Request/response validation |
| pydantic-settings | 2.6.1 | `.env` config loading |
| pytest | 8.3.4 | Test runner |
| pytest-asyncio | 0.24.0 | Async test support |
| httpx | 0.28.0 | Test HTTP client (ASGITransport) |

### Frontend
| Package | Version | Purpose |
|---------|---------|---------|
| React | 18.3.1 | UI framework |
| TypeScript | 5.9.3 | Type safety |
| Vite | 6.4.3 | Build tool + dev server |
| Tailwind CSS | 3.4.19 | Utility-first styling |
| React Router DOM | 6.30.4 | Client-side routing |
| Zustand | 5.0.14 | Global state (auth, persisted) |
| Axios | 1.17.0 | HTTP client |
| React Hook Form | 7.77.0 | Form state management |
| Zod | 3.25.76 | Schema validation |
| Lucide React | 0.468.0 | Icon library |
| react-i18next | 15.5.2 | Internationalisation (EN/FR) |
| i18next | 24.2.3 | i18n core |

---

## Backend API Endpoints

### Health
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | `{"status":"ok","version":"0.1.0"}` |

### Auth — `/api/v1/auth`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | None | Create PATIENT account → JWT + refresh cookie |
| POST | `/login` | None | Login → JWT + refresh cookie |
| POST | `/logout` | None | Clears refresh cookie |
| POST | `/refresh` | Cookie | Issues new token pair |
| GET | `/me` | Bearer | Returns current user profile |

### Patients — `/api/v1/patients`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/me` | Bearer | Get own patient profile |
| POST | `/me` | Bearer | Create patient profile |
| PATCH | `/me` | Bearer | Update patient profile |

### Analyze — `/api/v1/analyze`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | Bearer | Upload pill image → analysis result (persisted to DB) |

### Admin — `/api/v1/admin` (ADMIN role only, 403 otherwise)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/stats` | Bearer + ADMIN | Platform stats (users, analyses, admins) |
| GET | `/users` | Bearer + ADMIN | List all users |
| PUT | `/users/{id}/activate` | Bearer + ADMIN | Activate a user |
| PUT | `/users/{id}/deactivate` | Bearer + ADMIN | Deactivate a user |
| PUT | `/users/{id}/role` | Bearer + ADMIN | Change user role |
| DELETE | `/users/{id}` | Bearer + ADMIN | Delete a user |
| GET | `/analyses` | Bearer + ADMIN | Audit log of all analyses |

### Dev — `/api/v1/dev` (404 in production)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/seed-admin` | None | Create or promote account to ADMIN (dev bootstrap) |

---

## Database Schema

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR(36) | UUID primary key |
| email | VARCHAR(255) | Unique, indexed |
| hashed_password | VARCHAR(255) | bcrypt hash |
| role | VARCHAR(20) | `PATIENT` or `ADMIN` |
| is_active | BOOLEAN | default true |
| is_verified | BOOLEAN | default false |
| created_at / updated_at | DATETIME | auto |

### `patients`
| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR(36) | UUID primary key |
| user_id | VARCHAR(36) | FK → users.id (CASCADE) |
| first_name / last_name | VARCHAR(100) | |
| date_of_birth | DATE | required |
| preferred_language | VARCHAR(10) | default `en` |
| phone_number | VARCHAR(20) | nullable |
| medications_analyzed | INTEGER | running count |
| last_scan_at | DATETIME | nullable |

### `analyses`
| Column | Type | Notes |
|--------|------|-------|
| id | VARCHAR(36) | UUID primary key |
| user_id | VARCHAR(36) | FK → users.id (CASCADE) |
| status | VARCHAR(20) | `pending`, `completed`, `failed` |
| image_filename | VARCHAR(255) | nullable |
| raw_result | TEXT | nullable (ML JSON) |
| guidance | TEXT | nullable (LLM text) |
| ml_pipeline_enabled | BOOLEAN | flag at time of scan |
| created_at | DATETIME | auto |

---

## Authentication Design

- **Access token** — 60-min JWT, `Authorization: Bearer <token>` header
- **Refresh token** — 7-day JWT, `HttpOnly` cookie scoped to `/api/v1/auth/refresh`
- **RBAC** — `get_current_admin` dep returns 403 for non-ADMIN users; `RequireAdmin` React guard redirects to `/dashboard`
- **bcrypt==4.0.1** — hard pin, passlib 1.7.4 is incompatible with bcrypt 5.x

---

## Frontend Pages & Routes

| Route | Component | Access |
|-------|-----------|--------|
| `/login` | LoginPage | Guest only |
| `/register` | RegisterPage | Guest only |
| `/dashboard` | DashboardPage | Auth required |
| `/dashboard/analyze` | AnalyzePage | Auth required |
| `/admin/dashboard` | AdminDashboardPage | ADMIN only |
| `/admin/users` | AdminUsersPage | ADMIN only |
| `*` | NotFoundPage | Public |

**Theme:** Light — `bg-slate-50` body, `bg-white` cards, `teal-600` primary. Auth pages use `bg-brand-hero` teal gradient left panel. No dark/navy palette.

**i18n:** `react-i18next` with EN + FR locales. Language stored in `localStorage('pillsafe-lang')`. EN/FR toggle in Topbar and auth pages.

---

## Swagger UI

- URL: **http://localhost:8000/docs**
- `persistAuthorization: true` — token survives page refresh
- Step-by-step auth instructions in the API description
- Endpoint groups: auth / patients / analyze / admin / dev / health
- To bootstrap admin: `POST /api/v1/dev/seed-admin` → copy token → click Authorize

---

## CI Pipeline (GitHub Actions)

File: `.github/workflows/ci.yml`  
**Triggers:** push / PR to `main` or `develop`

### Backend job
1. Python 3.11 setup
2. `pip install -r dev/backend/requirements.txt`
3. `pytest tests/ -v --tb=short` (isolated SQLite test DB)

### Frontend job
1. Node 20 setup
2. `npm install`
3. `npm run type-check` (TypeScript strict)
4. `npm run build` (Vite production build)

---

## Test Suite

| Test | What it checks |
|------|----------------|
| `test_health` | `GET /health` → 200, `status: ok` |
| `test_register` | `POST /auth/register` → 201, `access_token` present |
| `test_login` | Register then login → 200, `access_token` present |
| `test_me_requires_auth` | `GET /auth/me` without token → 403 |

---

## How to Run Locally

### Backend
```bash
cd PillSafe_FINAL/dev/backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# API:   http://localhost:8000
# Docs:  http://localhost:8000/docs
```

### Frontend
```bash
cd PillSafe_FINAL/dev/frontend
npm install
npm run dev
# UI: http://localhost:5173 (or 5174 if port taken)
```

### Bootstrap Admin (first time)
```
POST http://localhost:8000/api/v1/dev/seed-admin
{ "email": "admin@pillsafe.dev", "password": "Admin1234" }
```
Copy the returned `access_token` and use it in Swagger Authorize.

### Run Tests
```bash
cd PillSafe_FINAL/dev/backend
pytest tests/ -v
```

---

## Environment Variables (`.env` at project root)

```env
APP_ENV=development
SECRET_KEY=change-this-secret-key-in-production
DATABASE_URL=sqlite+aiosqlite:///./pillsafe.db
FRONTEND_ORIGIN=http://localhost:5173
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7
OPENAPI_ENABLED=true
ML_PIPELINE_ENABLED=false
LLM_API_KEY=
LLM_MODEL=claude-sonnet-4-6
```

---

## Git Commit History

| Hash | Message |
|------|---------|
| *(latest)* | feat: RBAC + admin pages + i18n light theme + Swagger improvements |
| `ca9b6a7` | fix: add missing package.json, package-lock.json, tsconfig.json to dev/frontend |
| `8b7a766` | refactor: restructure — backend+frontend under dev/, ML artifacts at root |
| `cdc0180` | fix: add tests/ and pytest.ini to fix CI pipeline failure |
| `d8dc016` | feat: restructure as Sprint-0 — SQLite backend, no Docker, beautiful UI |
| `a0b2043` | feat: initial PillSafe scaffold — FastAPI + React 18 + PostgreSQL + Redis |

---

## What Is NOT Done Yet (Upcoming Sprints)

| Item | Sprint |
|------|--------|
| Patient CRUD API fully tested | Sprint 1 |
| Real dashboard stats (from DB, not mock data) | Sprint 1 |
| Pill image upload + preprocessing pipeline | Sprint 2 |
| Computer vision model integration | Sprint 3–4 |
| Prescription label OCR | Sprint 3–4 |
| Real ML pipeline replacing the `/analyze` stub | Sprint 4 |
| LLM-generated guidance text (Claude API) | Sprint 4 |
| Drug interaction safety alerts | Sprint 4 |
| Email verification flow | TBD |
| Production deployment | Sprint 5 |
