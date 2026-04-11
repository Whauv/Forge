# Contributing

## Workflow

1. Create a feature branch from `main`.
2. Keep changes scoped and avoid mixing backend and frontend rewrites unless necessary.
3. Run the relevant validation commands before opening a pull request.

## Validation

- Backend: `python -m unittest discover -s tests -t .`
- Backend import sanity: `python -m compileall app tests`
- Frontend, when dependencies are installed:
  - `cd autopilot`
  - `cmd /c npm run test`
  - `cmd /c npm run build`

## Style

- Python code should remain typed where practical and keep async boundaries explicit.
- Next.js code should use strict TypeScript and server-side Supabase access in route handlers.
- Do not commit `.env`, `.env.local`, or any API credentials.
