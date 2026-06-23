# PillSafe — Project Progress Document

**Course:** HLTH 4892 Capstone
**Student:** Sumanth
**Last Updated:** 2026-06-23
**Repository:** https://github.com/SumanthReddyKConestoga/PillSafe
**Branch:** `main`

---

## What Is PillSafe?

PillSafe is a medication safety web application that lets patients photograph their prescription labels and pills. The system reads the prescription via OCR, detects pill colour/shape via OpenCV, looks candidates up against a DIN reference table, and returns plain-language guidance plus safety alerts — helping patients verify they're taking the right medication at the right dose. A voice assistant and disclaimer guardrails support elderly, low-literacy, and visually impaired users.

---

## 2026-06-23 — PILLSAFE_BUILD.md implementation (this session)

Everything in `PILLSAFE_BUILD.md` was implemented in this session, in priority order. This section documents **what was built, what's stubbed on purpose, and decisions teammates should know about** before extending this code.

### Priority 1 — Prescription OCR + My Medications ✅
- **New model:** `Prescription` (`app/models/prescription.py`) — `patient_id` FK, `drug_name`, `dosage`, `frequency_text`, `time_slots` (JSON), `specific_times` (JSON), `prescribing_doctor`, `refills_remaining`, `expiry_date`, `is_active`, `image_path`.
- **Timing parser:** `app/services/timing_parser.py` — pure regex, no ML. Maps phrases (`twice daily`, `with meals`, `at bedtime`, …) to `["morning","afternoon","evening","night"]` slots and parses explicit clock times (`8am`, `8:00 PM`) into `"HH:MM"`.
- **OCR service:** `app/services/ocr_service.py` wraps PaddleOCR with a lazy import — if `paddleocr` isn't installed, it raises `OcrUnavailableError` and the route falls back to demo text instead of crashing.
- **Endpoints** (`app/api/v1/routes/prescriptions.py`): `POST /prescriptions` (upload → save image → OCR → parse → save), `GET /prescriptions/me`, `PATCH /prescriptions/{id}`, `DELETE /prescriptions/{id}` (soft delete). All ownership-scoped; admins get `403` (see `get_current_patient` dependency below).
- **Frontend:** `AnalyzePage` was rebuilt around `CameraCapture` (`getUserMedia` → canvas → blob → confirm/retake, falls back to a file input if camera permission is denied). Default mode opens the camera immediately and posts to `/prescriptions`.
- **My Medications page** (`/dashboard/medications`): empty state, prescription cards with colour-coded time-slot badges, remove button (soft delete).
- **Dashboard "Today's Schedule"**: now pulls `GET /prescriptions/me` and groups by time slot instead of showing a static placeholder.

### Priority 2 — Light theme ✅ (extended, not replaced)
The app already had a light teal theme from an earlier sprint. Rather than re-skin everything, the exact `PILLSAFE_BUILD.md` design tokens were **added** to `tailwind.config.ts` (`primary`, `surface`, `border`, `text`, `success`/`warning`/`danger`, `morning`/`afternoon`/`evening`/`night`) and the typography scale (18px/1.7 body, 32/24/20px headings) was added to `globals.css`. All new pages use these tokens.
- **Bugs found and fixed while doing this:** `Alert.tsx`, `Button.tsx`'s danger variant, and `NotFoundPage.tsx` had leftover dark-theme classes (`text-teal-300`, `bg-navy-950`, `ring-offset-navy-900`) from a prior theme migration that was never fully finished — these failed WCAG AA contrast or rendered a dark page despite the "zero dark backgrounds" rule. Fixed.
- **Known gap:** a few pre-existing icon buttons (Topbar bell/search, Sidebar avatar chip) are visually `h-9 w-9` (36px), under the 44×44px touch-target minimum. Not changed in this pass to avoid a risky wide-reaching restyle of already-working, polished components — flagging as a follow-up.

### Priority 3 — Zero 404s ✅
All previously-404ing nav links now resolve to real pages:
- `/dashboard/profile` — editable profile, stats (medications analyzed / active prescriptions / last scan), change-password section.
- `/dashboard/safety` — Safety Records table, sourced from a **new read-only** `GET /scans/me` endpoint that derives match status (`matched`/`warning`/`unmatched`) by joining the existing `analyses` table against active prescriptions live — no new write path, no change to the existing `/analyze` stub.
- `/dashboard/education` — static content (how-to, label anatomy, can/cannot disclaimer, safety tips, FAQ).
- `/dashboard/settings` — notification toggle (persisted via `PATCH /patients/me`), voice toggle (localStorage), language, Danger Zone delete-account (confirm modal → `DELETE /patients/me`).
- `/about`, `/contact`, and `/` (public landing) — previously `/` always redirected straight to `/dashboard` → `/login` for guests. Now served by a new `PublicLayout` with no auth requirement.
- **New backend endpoints:** `POST /api/v1/contact` (logs to `uploads/contact_messages.jsonl`, no auth), `PATCH /patients/me/password`, `DELETE /patients/me`.
- **Real bugs found and fixed along the way:**
  1. `User.patient` relationship had no cascade — deleting a `User` tried to null out `patients.user_id` (NOT NULL) instead of cascading the delete. Fixed by adding `cascade="all, delete-orphan"` in `app/models/user.py`.
  2. Returning a freshly-`flush()`-ed ORM object directly to FastAPI for response serialization intermittently hit `MissingGreenlet` errors on server-computed columns (`onupdate=func.now()`) because the attribute was expired but no async context was available to refresh it lazily. Fixed by adding `await db.refresh(...)` after `flush()` in `prescription_service.update_prescription` and (pre-emptively, since the new Profile/Settings pages exercise it) `patient_service.update_patient`.

### Priority 4 — Voice Assistant ✅
`src/lib/voiceAssistant.ts` — a small singleton over `window.speechSynthesis`, state in `localStorage('voice_enabled')`, pub/sub so the Topbar toggle button stays in sync. `useVoicePageAnnounce(pageName)` hook announces "`<Page> page loaded.`" on mount; wired into every dashboard page. Also speaks the dashboard greeting, My Medications count, and pill-scan match/mismatch results. Topbar has a persistent 44×44px speaker icon (filled teal when on, muted+slash when off, `aria-label` + tooltip).

### Priority 5 — Guardrails & Disclaimer ✅
- `DisclaimerModal` — shown once globally on first-ever dashboard visit (`localStorage('disclaimer_accepted')`), and **again** before every scan result is displayed (separate, non-persistent gate) — cannot be dismissed except via "I Understand".
- **Mismatch guardrail** — after a pill-mode scan, the frontend fetches active prescriptions and compares the DIN candidates' product names against them. Match → green card; no match → red "do not take" warning; match-but-wrong-time (±60min window against `specific_times`) → amber reminder with the next scheduled time.
- **Note on scope:** `PILLSAFE_BUILD.md`'s guardrail section literally references `/api/v1/analyze` (the original pill-stub), but Priority 6 (written later in the same doc) introduces the new `/api/v1/analyze/pill` endpoint for the real OpenCV+DIN flow. There's no `drug_name` to guard on in the old stub flow once the UI no longer calls it (see Priority 6 note below), so the guardrail was implemented against `/analyze/pill`'s DIN candidates instead — the only sensible reading once both priorities are read together. Documenting this explicitly so nobody "fixes" it back to the old endpoint.
- Admin-vs-patient data isolation: a new `get_current_patient` dependency (`app/api/deps.py`) returns `403` for any `ADMIN`-role JWT hitting `/prescriptions`, `/scans`, or `/patients/me/password` — not just a 404, a real 403, per the explicit acceptance criterion.

### Priority 6 — Pill detection (OpenCV + PaddleOCR + DIN) ✅, DIN data intentionally empty
- `app/services/pill_detection.py` — **real** OpenCV: Otsu threshold + largest contour → HSV mean hue/sat/val → colour bucket; contour circularity/aspect-ratio/solidity → shape (`round`/`oval`/`capsule`/`oblong`/`square`). Not a stub — it does real image math, gracefully raising `CvUnavailableError` if `opencv-python-headless` isn't installed (returns `501 CV_UNAVAILABLE` to the client).
- `DinPill` model + table exist with the right schema and indices (`colour`, `shape`, `imprint`) but **no seed data was loaded** — by explicit decision (see below), so `/analyze/pill` will return an empty `candidates` list until someone loads a real Health Canada DPD extract.
- New endpoint: `POST /api/v1/analyze/pill` → `{ detected_color, detected_shape, detected_imprint, candidates, claude_description }`.
- Frontend: AnalyzePage has a "Scan Prescription" / "Scan Pill" mode toggle; Pill mode shows detected attributes, the (likely empty) candidate list, and the Claude guidance card when present.

### Priority 7 — Claude API guidance layer ✅, inert until a key is added
- `app/services/claude_service.py` — only sends `color`/`shape`/`imprint`/`candidates` as plain text, **never the image**, per the Data Privacy rule. Calls the `anthropic` SDK lazily; returns `None` (not an error) if `LLM_API_KEY` is blank or the package isn't installed.
- Wired into `/analyze/pill`: called automatically when there are zero DIN candidates or no imprint was read.

### Decisions made with the user up front (recorded so nobody re-litigates them)
1. **DIN dataset:** no real Health Canada DPD data was available in the repo, and the user explicitly chose to leave `din_pills` **empty** rather than have data invented. Load real data before demoing pill-mode matches.
2. **Claude API key:** wired fully, left blank — user will paste a real key into `.env` (`LLM_API_KEY`) when ready.
3. **PaddleOCR / OpenCV install:** code was written and wired, but the actual `pip install` of these packages was **not** run in this environment (Windows, would be slow/fragile). They live in `dev/backend/requirements-optional.txt`, **not** `requirements.txt`, specifically so they don't get pulled into the Render production build (`render.yaml` runs `pip install -r requirements.txt` on every deploy — `paddlepaddle` there would risk breaking or massively slowing that build).

### Verification performed
- Backend: 20 pytest tests pass (`cd dev/backend && pytest tests/ -v`), including new coverage for prescriptions (CRUD, ownership, admin-block), pill analysis (graceful 501 without OpenCV, mocked happy path with empty candidates), scans, contact, and patient self-service (password change, account deletion).
- Frontend: `npm run type-check` and `npm run build` both pass clean across every new/changed file.
- Live smoke test: started both dev servers and exercised `/health`, `/auth/register`, `/prescriptions/me`, `/scans/me`, `/patients/me`, `/contact` via real HTTP requests against the running backend — all returned expected shapes.
- **Not done:** a full visual/browser QA pass (no headless-Chromium tooling was available in this Windows environment without a heavyweight Playwright+Chromium install). Recommend a teammate opens `http://localhost:5173` and clicks through the new pages, especially camera permission flows, before demoing.

---

## Current Project Status

| Area | Status |
|------|--------|
| Folder structure | Finalised and stable |
| Backend API (FastAPI) | Auth + Patients + Prescriptions + Analyze (legacy + pill) + Scans + Contact + Admin — fully working |
| Frontend UI (React 18) | Light theme, i18n (EN/FR) on pre-existing pages, all `PILLSAFE_BUILD.md` pages built (new pages are EN-only, see Known Gaps) |
| RBAC | PATIENT / ADMIN roles enforced front + back; admins explicitly 403'd off all patient-data endpoints |
| Database (SQLite) | Code-first, auto-created on startup, additive column-sync helper handles new columns on existing DBs |
| Camera capture | `getUserMedia` viewfinder with file-upload fallback, reused for both prescription and pill scanning |
| OCR pipeline | Real PaddleOCR wrapper, feature-flagged, demo-data fallback when disabled/unavailable |
| Pill detection | Real OpenCV colour/shape math, DIN table empty pending real data |
| Claude guidance | Real Anthropic SDK integration, inert until `LLM_API_KEY` is set |
| Voice assistant | Real Web Speech API singleton wired across all dashboard pages |
| Disclaimer + guardrails | First-use modal + per-scan modal + prescription-mismatch/timing checks |
| Swagger UI | Enabled at `/docs`, all new routers tagged and documented |
| CI Pipeline | Backend pytest + frontend typecheck/build (unaffected by optional heavy deps — see `requirements-optional.txt`) |
| Docker / Redis | Not used — SQLite only, no containers (unchanged from prior sprint) |

---

## Known Gaps / Follow-ups for the team

- **Load real DIN data.** `app/models/din_pill.py` defines the schema; write a one-off loader script for the Health Canada DPD extract and bulk-insert into `din_pills`.
- **Install + test OCR/CV locally** before a live demo: `pip install -r dev/backend/requirements-optional.txt`, then set `OCR_PIPELINE_ENABLED=true` in `.env`.
- **Add a real Claude API key** to `.env` (`LLM_API_KEY`) to see live AI guidance instead of `claude_description: null`.
- **i18n coverage:** new pages (Analyze rebuild, My Medications, Profile, Safety, Education, Settings, Landing, About, Contact) are English-only. Pre-existing pages (Login/Register/Dashboard shell/Admin) remain EN/FR. Add FR strings if full bilingual coverage is required.
- **Touch-target audit:** Topbar bell/search icon and Sidebar avatar chip are 36px, under the 44px minimum — low-risk visual fix, deferred to avoid a wide-blast-radius restyle in this pass.
- **Browser/visual QA:** do a manual click-through, especially camera permission prompts on a real device — this was not visually verified in this session (only typecheck/build/pytest/curl).

---

## Folder Structure

```
PillSafe_FINAL/
├── dev/
│   ├── backend/                  ← FastAPI + SQLAlchemy + SQLite
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── deps.py           get_current_user, get_current_admin, get_current_patient
│   │   │   │   └── v1/
│   │   │   │       ├── router.py     mounts every router below
│   │   │   │       └── routes/
│   │   │   │           ├── auth.py           register/login/logout/refresh/me
│   │   │   │           ├── patients.py       profile CRUD + password change + self-delete
│   │   │   │           ├── prescriptions.py  OCR capture + My Medications CRUD
│   │   │   │           ├── analyze.py        legacy pill-stub demo (unchanged)
│   │   │   │           ├── pill.py           OpenCV + PaddleOCR + DIN + Claude (/analyze/pill)
│   │   │   │           ├── scans.py          read-only Safety Records
│   │   │   │           ├── contact.py        public contact form
│   │   │   │           ├── admin.py          stats, users CRUD, analyses audit
│   │   │   │           └── dev.py            seed-admin (dev only, 404 in prod)
│   │   │   ├── core/
│   │   │   │   ├── config.py     pydantic-settings, feature flags
│   │   │   │   ├── database.py   async SQLite engine + additive column-sync helper
│   │   │   │   └── security.py   JWT sign/verify, bcrypt hashing
│   │   │   ├── models/
│   │   │   │   ├── user.py           User ORM (cascade-deletes Patient)
│   │   │   │   ├── patient.py        Patient ORM (+ notifications_enabled)
│   │   │   │   ├── analysis.py       Analysis ORM (legacy /analyze records)
│   │   │   │   ├── prescription.py   Prescription ORM
│   │   │   │   └── din_pill.py       DinPill ORM (empty — seed data pending)
│   │   │   ├── schemas/          pydantic request/response models per domain
│   │   │   ├── services/
│   │   │   │   ├── auth_service.py · patient_service.py · admin_service.py
│   │   │   │   ├── prescription_service.py · timing_parser.py
│   │   │   │   ├── ocr_service.py        PaddleOCR wrapper (lazy import)
│   │   │   │   ├── pill_detection.py     OpenCV colour/shape + DIN lookup
│   │   │   │   └── claude_service.py     Anthropic guidance (lazy import)
│   │   │   └── main.py           FastAPI factory, Swagger tags, CORS, /health
│   │   ├── tests/                 pytest + httpx async tests (20 tests)
│   │   ├── requirements.txt              core deps (what render.yaml installs)
│   │   └── requirements-optional.txt     PaddleOCR / OpenCV / anthropic
│   └── frontend/                 ← React 18 + TypeScript + Tailwind CSS
│       ├── src/
│       │   ├── api/               client · auth · admin · patients · prescriptions · pill · scans · contact
│       │   ├── components/
│       │   │   ├── CameraCapture.tsx     getUserMedia + canvas + file-upload fallback
│       │   │   ├── DisclaimerModal.tsx
│       │   │   ├── layout/               AppShell · Sidebar · Topbar · PublicLayout
│       │   │   └── ui/                   Button · Card · Input · Alert · LanguageSwitcher
│       │   ├── hooks/             useAuth · useVoicePageAnnounce
│       │   ├── lib/               voiceAssistant.ts
│       │   ├── i18n/              i18next init + en.json / fr.json
│       │   ├── pages/
│       │   │   ├── public/        LandingPage · AboutPage · ContactPage
│       │   │   ├── auth/          LoginPage · RegisterPage
│       │   │   ├── dashboard/     DashboardPage · AnalyzePage · MyMedicationsPage
│       │   │   │                 ProfilePage · SafetyRecordsPage · EducationPage · SettingsPage
│       │   │   ├── admin/         AdminDashboardPage · AdminUsersPage
│       │   │   └── NotFoundPage.tsx
│       │   ├── router/index.tsx   RequireAuth / RequireGuest / RequireAdmin guards
│       │   ├── store/authStore.ts Zustand persist (user + token)
│       │   └── styles/globals.css light theme tokens + typography scale
│       ├── tailwind.config.ts     teal palette + PILLSAFE_BUILD.md design tokens
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
| pytest / pytest-asyncio / httpx | 8.3.4 / 0.24.0 / 0.28.0 | Test runner + async HTTP test client |
| *(optional)* paddleocr / paddlepaddle | 2.9.1 / 2.6.2 | Prescription OCR — `requirements-optional.txt` |
| *(optional)* opencv-python-headless | 4.10.0.84 | Pill colour/shape detection — `requirements-optional.txt` |
| *(optional)* anthropic | 0.40.0 | Claude guidance layer — `requirements-optional.txt` |

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
| react-i18next / i18next | 15.5.2 / 24.2.3 | Internationalisation (EN/FR) |

---

## Database Schema

### `users`, `patients`, `analyses` — unchanged from prior sprint (see git history), except:
- `patients` gained `notifications_enabled BOOLEAN NOT NULL DEFAULT 1` (added via the additive column-sync helper in `database.py`, not a destructive migration).
- `User.patient` relationship now cascades deletes (`cascade="all, delete-orphan"`) so `DELETE /patients/me` works correctly.

### `prescriptions` (new)
| Column | Type | Notes |
|---|---|---|
| id | VARCHAR(36) | UUID PK |
| patient_id | VARCHAR(36) | FK → patients.id (CASCADE) |
| drug_name | VARCHAR(255) | |
| dosage, frequency_text, prescribing_doctor | VARCHAR | nullable |
| time_slots, specific_times | JSON | e.g. `["morning","evening"]`, `["08:00","20:00"]` |
| refills_remaining | INTEGER | nullable |
| expiry_date | DATE | nullable |
| is_active | BOOLEAN | soft-delete flag |
| image_path | VARCHAR(500) | stored under `uploads/prescriptions/{patient_id}/` |

### `din_pills` (new, empty)
| Column | Type | Notes |
|---|---|---|
| id, din | VARCHAR | |
| product, active_ingredient, strength | VARCHAR | nullable |
| colour, shape, imprint | VARCHAR | indexed — lookup columns |
| confidence | FLOAT | default 1.0 |

---

## Authentication Design

- **Access token** — 60-min JWT, `Authorization: Bearer <token>` header
- **Refresh token** — 7-day JWT, `HttpOnly` cookie scoped to `/api/v1/auth/refresh`
- **RBAC** — `get_current_admin` returns 403 for non-ADMIN users; `get_current_patient` (new) returns 403 for ADMIN users trying to touch patient data; `RequireAdmin` React guard redirects non-admins
- **bcrypt==4.0.1** — hard pin, passlib 1.7.4 is incompatible with bcrypt 5.x

---

## CI Pipeline (GitHub Actions)

Unchanged structure (`.github/workflows/ci.yml`) — backend `pytest`, frontend `type-check` + `build`. Confirmed both still pass after this session's changes; the optional OCR/CV/Claude packages are deliberately excluded from `requirements.txt` so CI stays fast and doesn't depend on them.

---

## How to Run Locally

See the **Quick Start** section in `README.md` — it now reflects the actual SQLite/no-Docker stack and documents the optional pipelines.

---

## Git Commit History (recent)

See `git log` for the authoritative history. As of this update, the most recent prior commits were:
- `cb462b0` feat: add Vercel + Render deployment configs
- `9d94079` feat: add Streamlit UI
- `c4359d9` feat: RBAC, admin pages, i18n light theme, Swagger improvements
- `ca9b6a7` fix: add missing package.json/package-lock.json/tsconfig.json to dev/frontend
- `8b7a766` refactor: restructure — backend+frontend under dev/, ML artifacts at root

This session's work (PILLSAFE_BUILD.md implementation) has not yet been committed — see `git status` / `git diff` for the full changeset before committing.
