import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase";

type ProjectDeploymentPageProps = {
  params: {
    id: string;
  };
};

export const dynamic = "force-dynamic";

export default async function ProjectDeploymentPage({
  params,
}: ProjectDeploymentPageProps) {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const { data: deployment, error } = await supabase
    .from("deployments")
    .select("*")
    .eq("project_id", params.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (
    <main className="rounded-[2rem] border border-line bg-surface p-8 shadow-[0_18px_60px_rgba(20,33,61,0.08)] dark:bg-surface/75">
      <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted">
        Deployment
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight">
        Latest deployment status
      </h1>

      {deployment ? (
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-line bg-background/75 p-5 dark:bg-background/35">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Pull request
            </p>
            {deployment.pr_link ? (
              <a
                href={deployment.pr_link}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block break-all text-sm font-medium text-accent hover:text-accent-strong"
              >
                {deployment.pr_link}
              </a>
            ) : (
              <p className="mt-3 text-sm text-muted">No PR link available yet.</p>
            )}
          </article>

          <article className="rounded-2xl border border-line bg-background/75 p-5 dark:bg-background/35">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Branch
            </p>
            <p className="mt-3 break-all text-sm font-medium text-foreground">
              {deployment.branch_name ?? "No branch recorded"}
            </p>
          </article>

          <article className="rounded-2xl border border-line bg-background/75 p-5 dark:bg-background/35">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
              Commit SHA
            </p>
            <p className="mt-3 break-all font-mono text-sm text-foreground">
              {deployment.commit_sha ?? "No commit SHA recorded"}
            </p>
          </article>
        </div>
      ) : (
        <div className="mt-8 rounded-[1.75rem] border border-dashed border-line bg-background/75 p-8 text-sm leading-7 text-muted dark:bg-background/35">
          No deployment records exist for this project yet.
        </div>
      )}
    </main>
  );
}
