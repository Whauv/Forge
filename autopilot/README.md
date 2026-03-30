# AutoPilot

AutoPilot is a full-stack AI-powered DevOps automation app built with Next.js 14, TypeScript, Tailwind CSS, and Supabase.

Phase 1 bootstraps the product foundation:

- Next.js App Router frontend
- Supabase Auth with GitHub OAuth
- protected routes via middleware
- Vercel environment placeholders
- initial Supabase SQL migration

## Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Supabase Auth
- Supabase PostgreSQL + Realtime
- Vercel

## Local Development

1. Copy `.env.example` to `.env.local`
2. Fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
3. Install dependencies:

```bash
npm install
```

4. Start the app:

```bash
npm run dev
```

## Auth Flow

- `/login` is the public sign-in page
- `/auth/sign-in` starts GitHub OAuth
- `/auth/callback` exchanges the OAuth code for a Supabase session
- all other routes are protected by `middleware.ts`

## Project Structure

```text
src/
|-- app/
|   |-- auth/
|   |-- login/
|   `-- page.tsx
`-- lib/
    `-- supabase.ts
```

## Database

The initial schema is in `supabase/migrations/001_init.sql` and creates:

- `projects`
- `tasks`
- `code_artifacts`
- `deployments`

## Deployment

`vercel.json` includes Vercel env placeholders for the project.
