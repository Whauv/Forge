# Forge

Forge is an AI Forward Deployed Engineer backend built with FastAPI, LangGraph, Supabase, Qdrant, Gemini, PyGithub, Firecrawl, and E2B.

It ingests code and docs, analyzes client problems against retrieved context, plans implementation tasks, generates diffs, validates them in a sandbox, opens pull requests, and stores reusable solution templates for future runs.

## Architecture

The application lives under `app/`:

```text
app/
|-- agents/      # Ingest, analysis, architect, coder, tester, deploy, feedback
|-- api/         # FastAPI route modules
|-- core/        # Shared config and JSON parsing helpers
|-- db/          # Supabase and Qdrant client helpers
|-- graph/       # LangGraph workflow orchestration
`-- main.py      # FastAPI app entrypoint
```

## Features

- Ingests GitHub repos, docs, and raw text into Qdrant
- Analyzes codebase context with Gemini + RAG
- Breaks solutions into implementation tasks
- Generates unified diffs and validation tests
- Runs sandboxed verification with retry logic
- Opens GitHub pull requests from approved changes
- Stores reusable solution templates for future retrieval
- Streams long-running workflow updates over SSE

## Requirements

- Python 3.11+
- Supabase project and tables
- Qdrant Cloud project
- Gemini API key
- GitHub token
- Firecrawl API key
- E2B API key

## Environment Variables

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

## Installation

Using `pip`:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Using `pyproject.toml`:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -e .
```

## Running Locally

```bash
uvicorn app.main:app --reload
```

Health check:

```bash
GET /health
```

## API Endpoints

- `POST /ingest`
- `POST /analyze`
- `POST /run`
- `POST /deploy`
- `POST /workflow`

`/analyze` and `/workflow` stream updates as Server-Sent Events.

## Workflow

The LangGraph workflow in `app/graph/workflow.py` runs:

```text
ingest -> analysis -> architect -> coder -> tester
tester -> coder      (if more tasks remain and tests pass)
tester -> deploy     (if all tasks pass)
tester -> end        (if human review is needed)
deploy -> feedback -> end
```

## Data Dependencies

Forge expects these Supabase tables:

- `projects`
- `tasks`
- `code_artifacts`
- `deployments`

Forge also uses Qdrant collections:

- `project_{project_id}`
- `solution_templates`

## Container Usage

Build:

```bash
docker build -t forge-ai-fde .
```

Run:

```bash
docker run --env-file .env -p 8000:8000 forge-ai-fde
```

## Notes

- Some agent integrations depend on external APIs and were structured for async-safe FastAPI usage.
- Deployment expects diffs in `code_artifacts` to be marked as approved before `POST /deploy`.
- The workflow endpoint is the easiest way to drive the full system end to end.
