# Forge

Forge is an AI Forward Deployed Engineer workspace with two applications:

- a Python FastAPI backend in `app/`
- a Next.js operator console in `autopilot/`

The backend handles ingestion, analysis, planning, coding, testing, deployment, and workflow orchestration. The frontend handles GitHub sign-in, project onboarding, streamed analysis, task review, artifact review, and deployment visibility.

## Backend architecture

```text
app/
|-- agents/      # Ingest, analysis, architect, coder, tester, deploy, feedback
|-- api/         # FastAPI route modules
|-- core/        # Shared config and JSON parsing helpers
|-- db/          # Supabase and Qdrant client helpers
|-- graph/       # LangGraph workflow orchestration
`-- main.py      # FastAPI app entrypoint
```

## Frontend architecture

```text
autopilot/
|-- src/app/         # Next.js App Router pages and route handlers
|-- src/components/  # Shared UI components
|-- src/lib/         # Supabase, env, email, and auth helpers
`-- supabase/        # SQL migrations for the frontend data model
```

## Local development

### Backend

```powershell
cd C:\Users\prana\OneDrive\Documents\Playground\Forge
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```powershell
cd C:\Users\prana\OneDrive\Documents\Playground\Forge\autopilot
cmd /c npm install --legacy-peer-deps
cmd /c npm run dev
```

## Environment files

- Backend variables live in `Forge/.env`
- Frontend variables live in `Forge/autopilot/.env.local`

These files are intentionally ignored and should never be committed.

## Backend environment variables

Copy `.env.example` to `.env` and set:

```env
QDRANT_URL=
QDRANT_API_KEY=
SUPABASE_URL=
SUPABASE_KEY=
GEMINI_API_KEY=
GITHUB_TOKEN=
E2B_API_KEY=
FIRECRAWL_API_KEY=
```

## Core API endpoints

- `POST /ingest`
- `POST /analyze`
- `POST /analyze/stream`
- `POST /run`
- `POST /deploy`
- `POST /workflow`
- `GET /health`

`/analyze/stream` and `/workflow` stream updates as Server-Sent Events.

## Workflow

The LangGraph workflow in `app/graph/workflow.py` runs:

```text
ingest -> analysis -> architect -> coder -> tester
tester -> coder      (if more tasks remain and tests pass)
tester -> deploy     (if all tasks pass)
tester -> end        (if human review is needed)
deploy -> feedback -> end
```

## Current state

Forge now has a functional frontend operator console, backend workflow scaffolding, backend agent source files, real frontend-to-backend analysis streaming, and a minimal API test suite. The backend still needs deeper production hardening and broader integration coverage before it can be considered fully production-ready.
