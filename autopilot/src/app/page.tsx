import { createServerSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const productHref = session ? "/projects" : "/login";
  const productLabel = session ? "Open product" : "Launch product";

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,122,24,0.22),_transparent_28%),linear-gradient(145deg,_#f6f0e5_0%,_#f0ece4_38%,_#fffaf2_100%)] text-[#14213d] dark:bg-[radial-gradient(circle_at_top_left,_rgba(255,155,82,0.14),_transparent_24%),linear-gradient(145deg,_#09111f_0%,_#0f172a_42%,_#121d33_100%)] dark:text-slate-100">
      <section className="relative border-b border-[#14213d]/10 px-6 py-6 dark:border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#d95d00] dark:text-[#ffb276]">
              Forge
            </p>
            <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
              AI Forward Deployed Engineer
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/Whauv/Forge"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[#14213d]/12 bg-white/70 px-4 py-2 text-sm font-semibold transition hover:border-[#ff7a18] hover:text-[#d95d00] dark:border-white/12 dark:bg-white/6 dark:hover:border-[#ff9b52] dark:hover:text-[#ffb276]"
            >
              GitHub repo
            </a>
            <a
              href={productHref}
              className="rounded-full bg-[#14213d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#21375e] dark:bg-[#ff9b52] dark:text-slate-950 dark:hover:bg-[#ffb276]"
            >
              {productLabel}
            </a>
          </div>
        </div>
      </section>

      <section className="px-6 py-12 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="space-y-8">
            <div className="inline-flex rounded-full border border-[#14213d]/10 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#8c4b17] shadow-[0_10px_30px_rgba(20,33,61,0.05)] dark:border-white/10 dark:bg-white/6 dark:text-[#ffd3b6]">
              From codebase context to deployable output
            </div>

            <div className="space-y-5">
              <h2 className="max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl">
                A product front door for teams who want to understand Forge before they run it.
              </h2>
              <p className="max-w-3xl text-lg leading-8 text-[#49566f] dark:text-slate-300">
                Forge ingests repositories and docs, retrieves relevant code context from a
                vector store, analyzes client problems, proposes implementation tasks, and
                walks projects through coding, testing, and deployment with an operator
                console on top.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                "Repo + docs ingestion",
                "Gemini-powered analysis",
                "Task graph and diff review",
                "Code, test, and deploy workflow",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[1.6rem] border border-[#14213d]/10 bg-white/75 px-5 py-5 text-sm font-medium text-[#30415d] shadow-[0_16px_40px_rgba(20,33,61,0.05)] dark:border-white/10 dark:bg-white/6 dark:text-slate-200"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <a
                href={productHref}
                className="inline-flex items-center justify-center rounded-full bg-[#ff7a18] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#d95d00] dark:bg-[#ff9b52] dark:text-slate-950 dark:hover:bg-[#ffb276]"
              >
                {productLabel}
              </a>
              <a
                href="https://github.com/Whauv/Forge"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-[#14213d]/12 px-6 py-4 text-sm font-semibold transition hover:border-[#ff7a18] hover:text-[#d95d00] dark:border-white/12 dark:hover:border-[#ff9b52] dark:hover:text-[#ffb276]"
              >
                Explore source code
              </a>
            </div>
          </div>

          <div className="space-y-5">
            <article className="rounded-[2rem] border border-[#14213d]/10 bg-white/80 p-7 shadow-[0_24px_60px_rgba(20,33,61,0.08)] dark:border-white/10 dark:bg-white/6">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8c4b17] dark:text-[#ffd3b6]">
                What it does
              </p>
              <div className="mt-5 space-y-4 text-sm leading-7 text-[#42506a] dark:text-slate-300">
                <p>Ingests GitHub repositories, documentation URLs, and raw project context.</p>
                <p>Builds vector-searchable context with Qdrant and structured records in Supabase.</p>
                <p>Generates analysis, implementation tasks, code diffs, test runs, and deployment handoff.</p>
                <p>Lets operators review tasks, artifacts, live pipeline status, and deployment outcomes from AutoPilot.</p>
              </div>
            </article>

            <article className="rounded-[2rem] border border-[#14213d]/10 bg-[#14213d] p-7 text-white shadow-[0_24px_60px_rgba(20,33,61,0.18)] dark:border-white/10 dark:bg-[#10192c]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">
                Install overview
              </p>
              <ol className="mt-5 space-y-4 text-sm leading-7 text-white/78">
                <li>1. Clone the Forge repository from GitHub.</li>
                <li>2. Set backend env vars for Qdrant, Supabase, Gemini, GitHub, Firecrawl, and E2B.</li>
                <li>3. Set frontend env vars for Supabase, Resend, and the backend URL.</li>
                <li>4. Run the Supabase migrations in `autopilot/supabase/migrations`.</li>
                <li>5. Start the FastAPI backend, then launch the Next.js AutoPilot console.</li>
              </ol>
            </article>
          </div>
        </div>
      </section>

      <section className="px-6 pb-14">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-[2rem] border border-[#14213d]/10 bg-white/78 p-7 shadow-[0_20px_54px_rgba(20,33,61,0.06)] dark:border-white/10 dark:bg-white/6">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8c4b17] dark:text-[#ffd3b6]">
              Product surfaces
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                ["Projects", "Onboard repos, docs, and problem statements."],
                ["Analysis", "Stream AI findings and solution framing."],
                ["Tasks", "Approve or reject generated implementation work."],
                ["Artifacts", "Inspect diffs, logs, and proceed gates."],
                ["Run Console", "Track pipeline steps across projects."],
                ["History", "Review prior deployment outcomes."],
              ].map(([title, copy]) => (
                <div
                  key={title}
                  className="rounded-[1.5rem] border border-[#14213d]/8 bg-[#fff9f2] px-4 py-4 dark:border-white/10 dark:bg-[#0f172a]/60"
                >
                  <h3 className="text-sm font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#596882] dark:text-slate-300">
                    {copy}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[2rem] border border-[#14213d]/10 bg-[linear-gradient(180deg,_rgba(255,122,24,0.12),_rgba(255,122,24,0.03))] p-7 shadow-[0_20px_54px_rgba(20,33,61,0.06)] dark:border-white/10 dark:bg-[linear-gradient(180deg,_rgba(255,155,82,0.14),_rgba(255,155,82,0.04))]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8c4b17] dark:text-[#ffd3b6]">
              Built so far
            </p>
            <div className="mt-5 space-y-4 text-sm leading-7 text-[#34425c] dark:text-slate-200">
              <p>
                The current build already includes a FastAPI backend with ingest, analyze,
                run, deploy, and workflow routes, plus a Next.js operator console with auth,
                project onboarding, SSE-backed analysis, task review, artifacts, pipeline
                status, and deployment visibility.
              </p>
              <p>
                This landing page is intentionally lightweight: it explains the product,
                points visitors to the code, and gives them a direct path into the live
                application without dropping them straight into a protected workspace.
              </p>
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
