# Cadence — Adaptive Academic Planner

Cadence is a local-first academic control center. It turns assignments, calendar commitments, and proficiency evidence into an explainable study plan while keeping deterministic application logic outside of AI models.

This repository contains a complete Phase 1: a FastAPI/SQLite backend, normalized domain model, deterministic scheduler, demo dataset, React calendar-first interface, assignment state machine, mastery/time-estimation foundations, tests, migrations, and a Tauri desktop wrapper.

## What works now

- Demo courses, assignments, protected time, fixed events, and study blocks
- Explicit assignment states with a required calibration gate
- Deterministic schedule recomputation with conflict avoidance, block splitting, priority, daily boundaries, and a deadline safety buffer
- Persisted schedule runs and human-readable placement decisions
- Today, Calendar, Assignments, Mastery, and Settings views
- Three-question calibration entry experience
- Responsive light/dark interface with offline-safe demo rendering
- REST/OpenAPI endpoints at `http://localhost:8000/docs`

Live Canvas, Google Calendar, LLM grading/generation, notifications, external API authentication, and MCP are later-phase integration work. Their environment variables and module boundaries are reserved, but this README does not claim they are connected.

## Quick start

Requires Python 3.9+ and Node 20+ with pnpm.

```bash
cp .env.example .env
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
cd apps/frontend && pnpm install && cd ../..
./scripts/dev.sh
```

Open `http://localhost:5173`. The API creates `planner.db`, seeds realistic demo records on first launch, and exposes interactive docs at `http://localhost:8000/docs`.

## Development

Run only the API:

```bash
.venv/bin/uvicorn backend.app.main:app --reload
```

Run only the frontend:

```bash
cd apps/frontend
pnpm dev
```

Run the Tauri shell after installing the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/):

```bash
cd apps/frontend
pnpm desktop
```

The local Python service must be running while using the Tauri shell. Packaging the Python backend as a managed sidecar is release engineering planned after the service surface stabilizes.

## Database and migrations

SQLModel definitions are in `backend/app/models.py`; Alembic migrations are in `backend/migrations/versions`.

```bash
.venv/bin/alembic upgrade head
.venv/bin/alembic revision --autogenerate -m "describe change"
```

SQLite is the default. Set `DATABASE_URL` to move to another SQLAlchemy-compatible database later.

## API

Implemented endpoints include:

- `GET /api/v1/status`
- `GET /api/v1/courses`
- `GET /api/v1/assignments`
- `GET /api/v1/assignments/upcoming`
- `GET /api/v1/calendar`
- `GET /api/v1/mastery`
- `GET /api/v1/dashboard`
- `POST /api/v1/schedule/recompute`
- `PATCH /api/v1/calendar/blocks/{id}`

FastAPI publishes the full OpenAPI document at `/openapi.json`. API-key authentication and a same-service MCP adapter are Phase 5 tasks; neither should expose raw LMS or calendar credentials.

## Scheduling and mastery

The Phase 1 scheduler is conventional code, not an LLM. It preserves locked blocks, ignores assignments waiting on calibration, avoids fixed/protected events, splits long tasks, and reports unplaced minutes as deadline risk. Defaults are 30–90 minute blocks, an 8 AM–10 PM workday, and a 12-hour deadline buffer.

Mastery updates use a bounded weighted formula based on prior mastery, evidence count, confidence, question difficulty, score, and recency. One answer can never swing a score by more than 0.20. Time estimates combine mastery, difficulty, historical speed, buffer, and a mandatory 30-minute review for low proficiency.

## Future integrations

Copy `.env.example` to `.env` when integration work begins:

- Canvas: `CANVAS_BASE_URL`, `CANVAS_ACCESS_TOKEN`
- Google Calendar: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Model providers: the listed provider keys and optional Ollama base URL

Production credentials must be placed in the OS keychain. `ProviderConfiguration.credential_key` is a lookup reference; plaintext secrets do not belong in SQLite. Canvas content must be sanitized and framed as untrusted data before it reaches any semantic model.

Model routing will use task IDs such as `ASSIGNMENT_ANALYSIS`, `DIAGNOSTIC_GENERATION`, `DIAGNOSTIC_GRADING`, `CONCEPT_REVIEW`, and `DAILY_SUMMARY`, each mapped to a provider configuration with a fallback.

## Testing and release

```bash
./scripts/test.sh
```

The suite covers scheduling constraints, conflicts, state transitions, mastery stability, time estimates, demo API data, OpenAPI, and recomputation. Frontend production compilation is part of the script.

For a web bundle, run `pnpm build` in `apps/frontend`. For a desktop build, install Tauri’s platform prerequisites and run `pnpm desktop:build` there. Bundling is intentionally disabled in the starter Tauri config until signing, icons, and the Python sidecar strategy are finalized.

## Repository map

```text
apps/frontend/       React + TypeScript + Vite client
apps/desktop/        Tauri 2 desktop shell
backend/app/         API, models, scheduler, services, connectors
backend/migrations/  Alembic migration history
tests/               Domain, scheduling, and API tests
docs/                Architecture decisions
scripts/             One-command development and verification
```

## Screenshots

Add release screenshots here after the first packaged desktop build. The demo mode always supplies stable, current-date data for capturing the Today, Calendar, Assignments, and Mastery views.
