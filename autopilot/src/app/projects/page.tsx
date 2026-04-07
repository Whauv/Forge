import Link from "next/link";

import { requireServerSessionOrRedirect } from "@/lib/server-access";
import type { ProjectRow } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const { supabase, session } = await requireServerSessionOrRedirect();

  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .returns<ProjectRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (
    <main className="space-y-6">
      <section className="flex flex-col gap-4 rounded-[2rem] border border-line bg-surface p-8 shadow-[0_18px_60px_rgba(20,33,61,0.08)] dark:bg-surface/75 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted">
            Projects
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            Tracked GitHub projects
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
            Review every repository that has been onboarded for this account and jump into
            its project workspace.
          </p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong"
        >
          New project
        </Link>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        {projects?.length ? (
          projects.map((project) => (
            <article
              key={project.id}
              className="rounded-[1.75rem] border border-line bg-surface p-6 shadow-[0_12px_36px_rgba(20,33,61,0.06)] dark:bg-surface/75"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                {new Date(project.created_at).toLocaleDateString()}
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">{project.name}</h2>
              <p className="mt-3 break-all text-sm leading-7 text-muted">
                {project.github_repo_url}
              </p>
              <div className="mt-6">
                <Link
                  href={`/projects/${project.id}`}
                  className="inline-flex rounded-full border border-line px-5 py-3 text-sm font-semibold transition hover:border-accent hover:text-accent"
                >
                  Open
                </Link>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-line bg-surface p-8 text-sm leading-7 text-muted dark:bg-surface/75">
            No projects yet. Create one to start ingesting repositories and generating AI
            workflows.
          </div>
        )}
      </section>
    </main>
  );
}
