import { redirect } from "next/navigation";

import { requireServerSessionOrRedirect } from "@/lib/server-access";
import type { DeploymentRow } from "@/types/db";

type HistoryDeployment = Pick<
  DeploymentRow,
  "id" | "status" | "pr_link" | "branch_name" | "commit_sha" | "created_at"
> & {
  project: { name?: string; user_id?: string } | { name?: string; user_id?: string }[] | null;
};

export const dynamic = "force-dynamic";

function statusClasses(status: string | null) {
  switch (status) {
    case "deployed":
    case "passed":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
    case "failed":
      return "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300";
    case "testing":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
    case "coding":
      return "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300";
    default:
      return "bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-300";
  }
}

function getProjectName(project: HistoryDeployment["project"]) {
  if (Array.isArray(project)) {
    return project[0]?.name ?? "Unknown project";
  }
  return project?.name ?? "Unknown project";
}

export default async function HistoryPage() {
  const { supabase, session } = await requireServerSessionOrRedirect();

  const { data: deployments, error } = await supabase
    .from("deployments")
    .select("id,status,pr_link,branch_name,commit_sha,created_at,project:projects(name,user_id)")
    .eq("project.user_id", session.user.id)
    .order("created_at", { ascending: false })
    .returns<HistoryDeployment[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (
    <main className="space-y-6">
      <section className="rounded-[2rem] border border-line bg-surface p-8 shadow-[0_18px_60px_rgba(20,33,61,0.08)] dark:bg-surface/75">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted">
          History
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Deployment history across all projects
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
          Review deployment outcomes, pull request links, and commit references across the
          projects you own.
        </p>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-line bg-surface shadow-[0_18px_60px_rgba(20,33,61,0.08)] dark:bg-surface/75">
        {deployments?.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-line text-sm">
              <thead className="bg-background/70 dark:bg-background/30">
                <tr className="text-left text-muted">
                  <th className="px-5 py-4 font-medium">Project Name</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium">PR Link</th>
                  <th className="px-5 py-4 font-medium">Branch</th>
                  <th className="px-5 py-4 font-medium">Commit SHA</th>
                  <th className="px-5 py-4 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {deployments.map((deployment) => (
                  <tr key={deployment.id} className="align-top">
                    <td className="px-5 py-4 font-medium text-foreground">
                      {getProjectName(deployment.project)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusClasses(
                          deployment.status,
                        )}`}
                      >
                        {deployment.status ?? "pending"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-muted">
                      {deployment.pr_link ? (
                        <a
                          href={deployment.pr_link}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all text-accent hover:text-accent-strong"
                        >
                          {deployment.pr_link}
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-5 py-4 break-all text-muted">
                      {deployment.branch_name ?? "-"}
                    </td>
                    <td className="px-5 py-4 break-all font-mono text-xs text-muted">
                      {deployment.commit_sha ?? "-"}
                    </td>
                    <td className="px-5 py-4 text-muted">
                      {new Date(deployment.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-sm leading-7 text-muted">
            No deployment history exists yet for your projects.
          </div>
        )}
      </section>
    </main>
  );
}
