# Backend Package

This package contains the Python backend for Forge.

- `agents/` implements the ingest, analysis, architect, coder, tester, deploy, and feedback agents.
- `api/` contains request schemas and FastAPI route modules.
- `core/` contains shared configuration and response streaming helpers.
- `db/` contains external data store clients and table helpers.
- `graph/` contains the LangGraph state machine that wires the agents together.
- `main.py` exposes the FastAPI entrypoint.
