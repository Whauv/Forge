export default function HistoryPage() {
  return (
    <main className="rounded-[2rem] border border-line bg-surface p-8 shadow-[0_18px_60px_rgba(20,33,61,0.08)] dark:bg-surface/75">
      <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted">
        History
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        Past runs and deployments will appear here.
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
        This route is ready for audit trails, deployment history, retry summaries, and
        outcome review once the project records and pipeline data are connected.
      </p>
    </main>
  );
}
