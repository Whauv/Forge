import { TaskGraph } from "@/components/task-graph";
import { requireOwnedProjectOrRedirect } from "@/lib/server-access";
import type { TaskRow } from "@/types/db";

type ProjectTasksPageProps = {
  params: {
    id: string;
  };
};

export const dynamic = "force-dynamic";

export default async function ProjectTasksPage({ params }: ProjectTasksPageProps) {
  const { supabase } = await requireOwnedProjectOrRedirect(params.id);

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("project_id", params.id)
    .order("created_at", { ascending: true })
    .returns<TaskRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (
    <main className="space-y-6">
      <section className="rounded-[2rem] border border-line bg-surface p-8 shadow-[0_18px_60px_rgba(20,33,61,0.08)] dark:bg-surface/75">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted">
          Task graph
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Review generated tasks for this project
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
          Approve or reject tasks as they are generated. Tasks with clarifying questions
          must be answered before approval is enabled.
        </p>
      </section>

      <TaskGraph tasks={tasks ?? []} />
    </main>
  );
}
