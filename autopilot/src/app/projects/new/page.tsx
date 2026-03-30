import { ProjectOnboardingForm } from "@/components/project-onboarding-form";

export default function NewProjectPage() {
  return (
    <main className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[2rem] border border-line bg-surface p-8 shadow-[0_18px_60px_rgba(20,33,61,0.08)] dark:bg-surface/75">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted">
          Onboarding
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Add a project for AutoPilot to analyze.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
          Create a project record with a repository, supporting docs, and a problem
          statement. This is the first step before ingest, task generation, and the
          code-to-deploy pipeline.
        </p>

        <div className="mt-8 rounded-[1.75rem] border border-line bg-background/75 p-6 dark:bg-background/35">
          <ProjectOnboardingForm />
        </div>
      </section>

      <aside className="rounded-[2rem] border border-line bg-[linear-gradient(180deg,_rgba(255,122,24,0.12),_rgba(255,122,24,0.02))] p-8 dark:bg-[linear-gradient(180deg,_rgba(255,155,82,0.16),_rgba(255,155,82,0.03))]">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-accent-strong">
          What happens next
        </p>
        <div className="mt-6 space-y-4">
          {[
            "Your project record is saved to Supabase.",
            "AutoPilot can ingest the repository and doc URLs.",
            "Analysis and task generation can stream through the app in later phases.",
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-line bg-surface px-5 py-4 text-sm leading-7 text-muted dark:bg-background/45"
            >
              {item}
            </div>
          ))}
        </div>
      </aside>
    </main>
  );
}
