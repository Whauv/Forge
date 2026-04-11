# Forge Agent Guide

## Setup

### Backend

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```powershell
cd autopilot
cmd /c npm install --legacy-peer-deps
cmd /c npm run dev
```

## Validation

```powershell
python -m unittest discover -s tests -t .
python -m compileall app tests
```

If frontend dependencies are installed:

```powershell
cd autopilot
cmd /c npm run test
cmd /c npm run build
```

## Folder Map

- `app/` contains the FastAPI backend package.
- `app/agents/` contains the workflow agents.
- `app/api/` contains FastAPI schemas and route modules.
- `app/core/` contains shared configuration and JSON streaming helpers.
- `app/db/` contains Supabase and Qdrant helpers.
- `app/graph/` contains the LangGraph workflow.
- `autopilot/` contains the Next.js operator console.
- `tests/` contains backend tests mirrored to backend modules.

## Working Rules

- Keep secrets in local env files only.
- Prefer non-destructive moves with `git mv` when restructuring files.
- Keep route handlers thin and move business logic into agents, core helpers, or db helpers.
- Add or update tests when backend helper behavior changes.
