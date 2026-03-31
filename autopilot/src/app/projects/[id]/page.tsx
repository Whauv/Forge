import Link from "next/link";
import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase";
import type { ProjectRow } from "@/types/db";

type ProjectDetailPageProps = {
  params: {
    id: string;
  };
};

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", session.user.id)
    .returns<ProjectRow[]>()
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!project) {
    redirect("/projects");
  }

  return (
    <main className="space-y-6">
      <section className="rounded-[2rem] border border-line bg-surface p-6 shadow-[0_18px_60px_rgba(20,33,61,0.08)] dark:bg-surface/75 sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted">
          Project Detail
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          {project.name}
        </h1>
        <p className="mt-4 break-all text-sm leading-7 text-muted sm:text-base">
          {project.github_repo_url}
        </p>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-muted sm:text-base">
          {project.problem_description || "No problem description has been captured yet."}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Link
          href={`/projects/${params.id}/analyze`}
          className="rounded-[1.5rem] border border-line bg-surface p-5 shadow-[0_12px_36px_rgba(20,33,61,0.06)] transition hover:border-accent dark:bg-surface/75"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
            Analysis
          </p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight">Analyze project</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Stream pain points and solution ideas for this repository.
          </p>
        </Link>
        <Link
          href={`/projects/${params.id}/tasks`}
          className="rounded-[1.5rem] border border-line bg-surface p-5 shadow-[0_12px_36px_rgba(20,33,61,0.06)] transition hover:border-accent dark:bg-surface/75"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
            Planning
          </p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight">View tasks</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Approve or reject implementation work before execution starts.
          </p>
        </Link>
        <Link
          href={`/projects/${params.id}/artifacts`}
          className="rounded-[1.5rem] border border-line bg-surface p-5 shadow-[0_12px_36px_rgba(20,33,61,0.06)] transition hover:border-accent dark:bg-surface/75"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
            Review
          </p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight">Review artifacts</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Inspect generated diffs, test logs, and proceed gates.
          </p>
        </Link>
        <Link
          href={`/projects/${params.id}/deployment`}
          className="rounded-[1.5rem] border border-line bg-surface p-5 shadow-[0_12px_36px_rgba(20,33,61,0.06)] transition hover:border-accent dark:bg-surface/75"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
            Delivery
          </p>
          <h2 className="mt-3 text-xl font-semibold tracking-tight">Deployment status</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Track pull request metadata and latest deployment state.
          </p>
        </Link>
      </section>
    </main>
  );
}
