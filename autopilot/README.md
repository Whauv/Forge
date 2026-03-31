# AutoPilot

AutoPilot is a full-stack AI-powered DevOps automation workspace built with Next.js 14, TypeScript, Tailwind CSS, and Supabase. It helps teams onboard GitHub repositories, stream AI analysis, review generated task plans, inspect code artifacts, monitor pipeline state in real time, and track deployment outputs from one responsive dashboard.

![Demo](./demo.gif)

## Overview

AutoPilot includes:

- GitHub OAuth authentication through Supabase Auth
- Project onboarding for repositories, docs, and problem statements
- SSE-powered analysis streaming for pain points and proposed solutions
- Task approval and rejection workflow
- Diff review for generated code artifacts
- Supabase Realtime pipeline updates
- Deployment details and history views
- Resend email notifications when a pull request is ready
- Persistent light and dark mode via `next-themes`

## Tech Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Supabase Auth, Postgres, and Realtime
- Resend for email notifications
- Vercel for deployment

## Prerequisites

Before running the app locally, make sure you have:

- Node.js 18 or newer
- npm
- A Supabase project
- A GitHub OAuth app configured in Supabase Auth
- A Resend account with an approved sender

## Environment Variables

Create `autopilot/.env.local` from `autopilot/.env.example` and set:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

All runtime environment variables are validated in [src/lib/env.ts](./src/lib/env.ts).

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the example environment file:

```bash
cp .env.example .env.local
```

3. Add your real Supabase and Resend values to `.env.local`.

4. Run the Supabase migration so the app tables exist:

```bash
supabase db push
```

If you are not using the CLI, run the SQL in [supabase/migrations/001_init.sql](./supabase/migrations/001_init.sql) from the Supabase SQL editor.

5. Start the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000).

Unauthenticated visitors are redirected to `/login`, and authenticated users land in the protected workspace.

## App Routes

- `/login` - GitHub sign-in
- `/projects` - all onboarded projects
- `/projects/new` - new project onboarding
- `/projects/[id]/analyze` - live analysis stream
- `/projects/[id]/tasks` - task approval graph
- `/projects/[id]/artifacts` - generated diff review
- `/projects/[id]/deployment` - latest deployment metadata
- `/console` - live pipeline console across projects
- `/history` - deployment history table

## GitHub OAuth Setup

1. In Supabase, enable GitHub as an auth provider.
2. Create a GitHub OAuth app.
3. Set the callback URL to:

```text
http://localhost:3000/auth/callback
```

4. Add the production callback URL in both Supabase and GitHub once deployed.

## Deployment

### Vercel Dashboard

1. Import the `autopilot` project into Vercel.
2. Add the same environment variables from `.env.local` in the Vercel project settings.
3. Deploy the default branch.

### Vercel CLI

```bash
npm install -g vercel
vercel
```

Follow the prompts and then add the same environment variables in Vercel.

## Notes

- API route handlers use the Supabase server client for database writes and updates.
- Realtime updates are consumed client-side only for live UI state.
- Theme preference is stored by `next-themes` in `localStorage`.
- The current analysis stream uses mock SSE events and is ready for backend AI integration.
