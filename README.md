# PillSafe

**AI-powered medication safety for patients who deserve to understand their prescriptions.**

PillSafe is a multi-modal medication analysis application built as part of the Conestoga College Graduate AI/ML program. It helps elderly, low-literacy, and visually impaired patients safely identify their medications and understand their prescription labels through camera-based scanning, plain-language guidance, and a voice assistant.

> **Decision Support Only** — PillSafe does not provide medical advice. Always confirm medication information with a licensed pharmacist or physician.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Browser (React 18 + Vite)                                              │
│  Public: Landing · About · Contact                                      │
│  Auth: Login · Register                                                 │
│  Dashboard: Dashboard · Analyze (camera) · My Medications · Profile     │
│             Safety Records · Education · Settings                       │
│  Admin: Admin Dashboard · User Management                               │
└────────────────────────────┬──────────────────────────────────────────────┘
                             │ HTTP (Vite dev proxy → /api/*)
                             ▼
┌────────────────────────────────────────────────────────────────────────┐
│  FastAPI (Python 3.11)                                                  │
│  /api/v1/auth            JWT + httpOnly refresh cookie                 │
│  /api/v1/patients        profile, password change, self-delete         │
│  /api/v1/prescriptions   OCR capture + My Medications CRUD             │
│  /api/v1/analyze         legacy pill-stub demo (unchanged)             │
│  /api/v1/analyze/pill    OpenCV colour/shape + PaddleOCR + DIN lookup  │
│  /api/v1/scans           read-only Safety Records                      │
│  /api/v1/contact         public contact form                           │
│  /api/v1/admin           platform stats, user management (RBAC)        │
└────────────────┬─────────────────────────────────────────────────────────┘
                 │
        ┌────────▼────────┐        ┌──────────────────────────────┐
        │  SQLite (dev)   │        │  Optional, feature-flagged:  │
        │  pillsafe.db    │        │  PaddleOCR · OpenCV · Claude │
        └─────────────────┘        └──────────────────────────────┘
```

---

## Tech Stack

| Layer          | Technology                                                     |
|-----------------|-----------------------------------------------------------------|
| Frontend        | React 18, TypeScript, Vite, TailwindCSS v3                     |
| State mgmt      | Zustand (localStorage persistence)                              |
| Forms           | React Hook Form + Zod                                            |
| HTTP client     | Axios (silent token refresh interceptor)                        |
| i18n            | react-i18next (EN/FR)                                            |
| Backend         | FastAPI, Python 3.11, async/await throughout                     |
| ORM             | SQLAlchemy 2.x async (code-first, additive column sync on boot) |
| Auth            | JWT (HS256), bcrypt cost-12, httpOnly refresh cookie             |
| Database        | **SQLite** (dev) — no Docker, no Redis, no Postgres required     |
| OCR             | PaddleOCR (optional — Priority 1B), regex-based timing parser    |
| Pill detection  | OpenCV colour/shape math + DIN database lookup (optional — Priority 6) |
| Guidance layer  | Claude API, structured attributes only, never raw images (optional — Priority 7) |
| Voice           | Web Speech API (`speechSynthesis`, browser-native)               |
| Camera          | `getUserMedia` (browser-native), file-upload fallback            |
| CI/CD           | GitHub Actions (backend pytest + frontend typecheck/build)       |
| Deploy          | Render (API) + Vercel (static frontend) — see `render.yaml` / `vercel.json` |

> No custom ML training, no FAISS, no YOLOv8, no NIH Pillbox dataset, no BioBERT. Pill detection is pure OpenCV math + PaddleOCR + a DIN lookup table, per `PILLSAFE_BUILD.md`.

---

## Quick Start

```bash
# Backend
cd dev/backend
python -m venv venv && source venv/Scripts/activate   # or venv/bin/activate on macOS/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# API:   http://localhost:8000
# Docs:  http://localhost:8000/docs

# Frontend (separate terminal)
cd dev/frontend
npm install
npm run dev
# UI: http://localhost:5173
```

The SQLite database file (`dev/backend/pillsafe.db`) is created automatically on first boot — no separate database server needed.

### Bootstrap an admin account (dev only)

```
POST http://localhost:8000/api/v1/dev/seed-admin
{ "email": "admin@pillsafe.dev", "password": "Admin1234" }
```
Copy the returned `access_token` and paste it into Swagger's **Authorize** button at `/docs`.

### Enabling the optional pipelines

Three capabilities are real, working pipelines that degrade gracefully when their dependency isn't installed — the app runs fully without them:

| Capability | Flag / config | To activate |
|---|---|---|
| Prescription OCR (Priority 1B) | `OCR_PIPELINE_ENABLED=true` in `.env` | `pip install -r dev/backend/requirements-optional.txt` |
| Pill colour/shape detection (Priority 6) | always attempted | `pip install -r dev/backend/requirements-optional.txt` (installs `opencv-python-headless`) |
| Claude guidance layer (Priority 7) | `LLM_API_KEY=<your key>` in `.env` | get an Anthropic API key, paste it in `.env` |

These are deliberately **not** in `dev/backend/requirements.txt` (which `render.yaml` installs on every deploy) since `paddlepaddle` is a large native package that would slow or risk breaking production builds. See `dev/backend/requirements-optional.txt`.

---

## API Reference

All endpoints are under `/api/v1/`. Protected routes require `Authorization: Bearer <access_token>`. Full interactive docs at `/docs`.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Create patient account, return token pair |
| POST | `/auth/login` | No | Validate credentials, return token pair |
| POST | `/auth/logout` | No | Clears refresh cookie |
| POST | `/auth/refresh` | Cookie | Issue new access token |
| GET | `/auth/me` | Bearer | Current user profile |
| GET / PATCH | `/patients/me` | Bearer | Get/update patient profile |
| PATCH | `/patients/me/password` | Bearer (patient) | Change password |
| DELETE | `/patients/me` | Bearer (patient) | Permanently delete own account |
| POST | `/prescriptions` | Bearer (patient) | Upload prescription photo → OCR → save |
| GET | `/prescriptions/me` | Bearer (patient) | List active prescriptions |
| PATCH / DELETE | `/prescriptions/{id}` | Bearer (patient) | Update / soft-delete a prescription |
| POST | `/analyze` | Bearer | Legacy pill-stub demo (unchanged, superseded by `/analyze/pill` in the UI) |
| POST | `/analyze/pill` | Bearer (patient) | OpenCV colour/shape + PaddleOCR imprint + DIN candidates + Claude guidance |
| GET | `/scans/me` | Bearer (patient) | Safety Records — past scans with prescription match status |
| POST | `/contact` | No | Public contact form submission |
| GET | `/admin/stats` `/admin/users` `/admin/analyses` | Bearer + ADMIN | Platform stats, user management, audit log |
| POST | `/dev/seed-admin` | No (dev only) | Bootstrap the first admin account |

**Admins are blocked (403) from every patient-data endpoint** (`/prescriptions`, `/scans`, `/patients/me/password`) — see `app/api/deps.py::get_current_patient`.

**Error envelope** — all errors use this shape:
```json
{ "detail": { "error": { "code": "EMAIL_TAKEN", "message": "An account with this email already exists.", "details": {} } } }
```

---

## Project Structure

```
PillSafe_FINAL/
├── dev/
│   ├── backend/                       FastAPI + SQLAlchemy + SQLite
│   │   ├── app/
│   │   │   ├── api/v1/routes/         auth · patients · prescriptions · analyze · pill
│   │   │   │                         scans · contact · admin · dev
│   │   │   ├── core/                  config · database (+ additive column sync) · security
│   │   │   ├── models/                user · patient · analysis · prescription · din_pill
│   │   │   ├── schemas/                pydantic request/response models
│   │   │   └── services/               auth · patient · prescription · timing_parser
│   │   │                              ocr_service · pill_detection · claude_service · admin
│   │   ├── tests/                      pytest + httpx (20 tests, see Test Suite)
│   │   ├── requirements.txt            core deps — installed on every deploy
│   │   └── requirements-optional.txt   PaddleOCR / OpenCV / anthropic — opt-in
│   └── frontend/                       React 18 + Vite + TypeScript
│       └── src/
│           ├── api/                    client · auth · patients · prescriptions · pill · scans · contact · admin
│           ├── components/             CameraCapture · DisclaimerModal · layout/ · ui/
│           ├── hooks/                  useAuth · useVoicePageAnnounce
│           ├── lib/                    voiceAssistant.ts (Web Speech API singleton)
│           ├── pages/
│           │   ├── public/             LandingPage · AboutPage · ContactPage
│           │   ├── auth/               LoginPage · RegisterPage
│           │   ├── dashboard/          DashboardPage · AnalyzePage · MyMedicationsPage
│           │   │                       ProfilePage · SafetyRecordsPage · EducationPage · SettingsPage
│           │   └── admin/              AdminDashboardPage · AdminUsersPage
│           ├── router/                 RequireAuth / RequireGuest / RequireAdmin guards
│           └── styles/globals.css      light-theme tokens, typography scale
├── render.yaml                         Render deploy (backend)
├── vercel.json                         Vercel deploy (frontend)
├── .github/workflows/ci.yml            CI: backend pytest + frontend typecheck/build
├── PILLSAFE_BUILD.md                   The build spec this codebase implements
└── PROGRESS.md                         Detailed log of what's built, per sprint
```

---

## Design System

Light theme only — see `tailwind.config.ts` for the full token set (`primary`, `surface`, `border`, `text`, `success`/`warning`/`danger`, `morning`/`afternoon`/`evening`/`night`). Body text defaults to 18px/1.7 line-height; `h1`/`h2`/`h3` follow a fixed 32/24/20px scale. Minimum 44×44px touch targets on all new interactive elements (a few pre-existing icon buttons in `Topbar`/`Sidebar` are slightly under this and are a known follow-up — see `PROGRESS.md`).

---

## Environment Variables (`.env` at project root)

| Variable | Description | Example |
|---|---|---|
| `APP_ENV` | `development` / `production` | `development` |
| `SECRET_KEY` | JWT signing secret — change in prod | `openssl rand -hex 32` |
| `DATABASE_URL` | SQLAlchemy async connection string | `sqlite+aiosqlite:///./pillsafe.db` |
| `FRONTEND_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |
| `OPENAPI_ENABLED` | Expose `/docs` and `/redoc` | `true` |
| `ML_PIPELINE_ENABLED` | Gate for the legacy `/analyze` real pipeline | `false` |
| `OCR_PIPELINE_ENABLED` | Gate for real PaddleOCR on `/prescriptions` | `false` |
| `LLM_API_KEY` | Anthropic API key — blank keeps guidance inert | *(blank until you add one)* |
| `LLM_MODEL` | Claude model id | `claude-sonnet-4-6` |
| `UPLOAD_DIR` | Where prescription images / contact log are written | `./uploads` |

---

## Test Suite

`cd dev/backend && pytest tests/ -v` — 20 tests covering auth, patients (password change, self-delete), prescriptions (CRUD, ownership, admin-block), pill analysis (graceful degradation without OpenCV, mocked happy path), scans, and the contact form.

---

## Known Limitations (by design)

- **DIN database is empty.** `din_pills` table exists with the right schema/indices but has no seed data — pill-mode scans will show "no matches found" until a real Health Canada DPD extract is loaded. See `app/models/din_pill.py`.
- **PaddleOCR / OpenCV are not installed by default.** `/prescriptions` falls back to demo OCR text and `/analyze/pill` returns a clear `501 CV_UNAVAILABLE` until `requirements-optional.txt` is installed.
- **Claude guidance is inert without an API key.** No raw images or PHI are ever sent — only structured colour/shape/imprint attributes, per the Data Privacy rule in `PILLSAFE_BUILD.md`.

---

## Contributing

**Branch naming:** `feat/<short-description>` · `fix/<issue>` · `chore/<task>`

**Commit messages:** [Conventional Commits](https://www.conventionalcommits.org/)

---

*PillSafe · Conestoga College Graduate AI/ML Program · AIML-6900 Capstone*
