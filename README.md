# Forge

Forge is an AI Forward Deployed Engineer workspace made up of two applications:

- a Python FastAPI backend in [app](/C:/Users/prana/OneDrive/Documents/Playground/Forge/app)
- a Next.js operator console in [autopilot](/C:/Users/prana/OneDrive/Documents/Playground/Forge/autopilot)

## Architecture

The backend is responsible for service integrations and orchestration boundaries:

- Supabase persistence
- Qdrant vector storage
- pipeline-oriented API surface

The AutoPilot frontend is responsible for:

- GitHub sign-in via Supabase Auth
- project onboarding and analysis flows
- task review, artifact review, and deployment history
- realtime pipeline visibility

## Local Development

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

## Environment Files

- Backend variables live in `Forge/.env`
- Frontend variables live in `Forge/autopilot/.env.local`

These files are intentionally ignored and should never be committed.

## Current State

Forge currently has a stronger operator console than backend execution engine. The FastAPI side is structured for future pipeline expansion, while the AutoPilot app provides the primary interactive experience today.

