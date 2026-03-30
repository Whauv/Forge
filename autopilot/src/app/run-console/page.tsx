export default function RunConsolePage() {
  return (
    <main className="rounded-[2rem] border border-line bg-surface p-8 shadow-[0_18px_60px_rgba(20,33,61,0.08)] dark:bg-surface/75">
      <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted">
        Run Console
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        Execution stream will live here.
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
        This placeholder route exists so the global navigation is fully wired. In the next
        phase, it can display SSE output, deployment status, and realtime pipeline logs.
      </p>
    </main>
  );
}
