type ProjectDetailPageProps = {
  params: {
    id: string;
  };
};

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  return (
    <main className="rounded-[2rem] border border-line bg-surface p-8 shadow-[0_18px_60px_rgba(20,33,61,0.08)] dark:bg-surface/75">
      <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted">
        Project Detail
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        Project workspace placeholder
      </h1>
      <p className="mt-4 text-base leading-7 text-muted">
        Project ID: {params.id}
      </p>
      <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
        This route is in place so project cards have a working destination. In the next
        phase, it can host ingest progress, generated tasks, diffs, and deployment state.
      </p>
    </main>
  );
}
