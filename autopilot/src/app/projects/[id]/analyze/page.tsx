import { AnalysisStream } from "@/components/analysis-stream";
import { requireOwnedProjectOrRedirect } from "@/lib/server-access";

type AnalyzePageProps = {
  params: {
    id: string;
  };
};

export default async function AnalyzePage({ params }: AnalyzePageProps) {
  await requireOwnedProjectOrRedirect(params.id);

  return (
    <main className="space-y-6">
      <section className="rounded-[2rem] border border-line bg-surface p-8 shadow-[0_18px_60px_rgba(20,33,61,0.08)] dark:bg-surface/75">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted">
          Analysis
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Stream AI findings for this project
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
          Ask a project-specific question and watch pain points and solution ideas render
          progressively as the server emits SSE events.
        </p>
      </section>

      <section className="rounded-[2rem] border border-line bg-surface p-8 shadow-[0_18px_60px_rgba(20,33,61,0.08)] dark:bg-surface/75">
        <AnalysisStream projectId={params.id} />
      </section>
    </main>
  );
}
