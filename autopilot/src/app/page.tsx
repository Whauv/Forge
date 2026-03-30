import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
      <section className="rounded-[2rem] border border-line bg-surface p-8 shadow-[0_18px_60px_rgba(20,33,61,0.08)] dark:bg-surface/75">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted">
          Projects
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Your AI delivery cockpit is ready.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
          This authenticated workspace is now protected by Supabase session middleware and
          ready for the next phase: project ingest, SSE analysis, and real-time execution
          status.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            "Connect a GitHub repository",
            "Persist project metadata in Supabase",
            "Stream analysis results over SSE",
            "Track deployment state in Realtime",
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-line bg-background/75 px-5 py-4 text-sm text-muted dark:bg-background/35"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      <aside className="rounded-[2rem] border border-line bg-[linear-gradient(180deg,_rgba(255,122,24,0.12),_rgba(255,122,24,0.02))] p-8 dark:bg-[linear-gradient(180deg,_rgba(255,155,82,0.16),_rgba(255,155,82,0.03))]">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent-strong">
          Session
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">
          Signed in and protected
        </h2>
        <p className="mt-4 text-sm leading-7 text-muted">
          Unauthenticated users are redirected to `/login`, while authenticated users land
          inside the shared app shell with navigation, user context, and theme controls.
        </p>
        <div className="mt-8 rounded-2xl border border-line bg-surface px-5 py-4 text-sm dark:bg-background/45">
          <p className="font-medium text-foreground">Current user</p>
          <p className="mt-2 break-all text-muted">{session.user.email}</p>
        </div>
      </aside>
    </main>
  );
}
