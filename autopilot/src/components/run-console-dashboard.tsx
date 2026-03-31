"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import type { DeploymentRow, DeploymentStatus, ProjectRow } from "@/types/db";

type ConsoleProject = Pick<ProjectRow, "id" | "name" | "github_repo_url" | "created_at"> & {
  taskCount: number;
  artifactCount: number;
};

type RunConsoleDashboardProps = {
  projects: ConsoleProject[];
  initialDeployments: DeploymentRow[];
};

type PipelineStep = {
  key: "ingest" | "analyze" | "code" | "test" | "deploy";
  label: string;
  description: string;
  status: "idle" | "running" | "success" | "failed";
  meta?: string;
};

function deriveSteps(
  project: ConsoleProject,
  deployment: DeploymentRow | null,
): PipelineStep[] {
  const deploymentStatus: DeploymentStatus | "idle" = deployment?.status ?? "idle";
  const taskCount = project.taskCount;
  const artifactCount = project.artifactCount;

  return [
    {
      key: "ingest",
      label: "Ingest",
      description: "Repository and docs are captured as project context.",
      status: "success",
      meta: new Date(project.created_at).toLocaleDateString(),
    },
    {
      key: "analyze",
      label: "Analyze",
      description: "Queries and task planning are available for the project.",
      status:
        taskCount > 0 ||
        ["coding", "testing", "passed", "failed", "deployed"].includes(deploymentStatus)
          ? "success"
          : "idle",
      meta: taskCount ? `${taskCount} task${taskCount === 1 ? "" : "s"}` : "No tasks yet",
    },
    {
      key: "code",
      label: "Code",
      description: "Generated diffs and artifacts are being assembled.",
      status:
        deploymentStatus === "coding"
          ? "running"
          : artifactCount > 0 ||
              ["testing", "passed", "failed", "deployed"].includes(deploymentStatus)
            ? "success"
            : "idle",
      meta: artifactCount
        ? `${artifactCount} artifact${artifactCount === 1 ? "" : "s"}`
        : "Waiting on code generation",
    },
    {
      key: "test",
      label: "Test",
      description: "Sandbox validation and retry handling.",
      status:
        deploymentStatus === "testing"
          ? "running"
          : deploymentStatus === "failed"
            ? "failed"
            : ["passed", "deployed"].includes(deploymentStatus)
              ? "success"
              : "idle",
      meta:
        (deployment?.retry_count ?? 0) > 0
          ? `${deployment?.retry_count} retr${deployment?.retry_count === 1 ? "y" : "ies"}`
          : "No retries",
    },
    {
      key: "deploy",
      label: "Deploy",
      description: "Pull request handoff and release readiness.",
      status:
        deploymentStatus === "deployed"
          ? "success"
          : deploymentStatus === "failed"
            ? "failed"
            : deploymentStatus === "passed"
              ? "running"
              : "idle",
      meta: deployment?.branch_name ?? "Awaiting PR branch",
    },
  ];
}

function stepStyles(status: PipelineStep["status"]) {
  switch (status) {
    case "running":
      return {
        dot: "bg-amber-500 animate-pulse",
        card: "border-amber-300/70 bg-amber-500/8 dark:border-amber-400/25 dark:bg-amber-500/10",
        label: "Running",
      };
    case "success":
      return {
        dot: "bg-emerald-500",
        card: "border-emerald-300/70 bg-emerald-500/8 dark:border-emerald-400/25 dark:bg-emerald-500/10",
        label: "Success",
      };
    case "failed":
      return {
        dot: "bg-rose-500",
        card: "border-rose-300/70 bg-rose-500/8 dark:border-rose-400/25 dark:bg-rose-500/10",
        label: "Failed",
      };
    default:
      return {
        dot: "bg-zinc-300 dark:bg-slate-600",
        card: "border-line bg-background/65 dark:bg-background/30",
        label: "Idle",
      };
  }
}

export function RunConsoleDashboard({
  projects,
  initialDeployments,
}: RunConsoleDashboardProps) {
  const [deployments, setDeployments] = useState<DeploymentRow[]>(initialDeployments);

  const projectIds = useMemo(() => new Set(projects.map((project) => project.id)), [projects]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel("autopilot_console")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deployments",
        },
        (payload) => {
          const incoming = payload.new as DeploymentRow;
          if (!incoming?.project_id || !projectIds.has(incoming.project_id)) {
            return;
          }

          setDeployments((current) => {
            const index = current.findIndex((item) => item.id === incoming.id);
            if (index >= 0) {
              const next = [...current];
              next[index] = incoming;
              return next;
            }
            return [incoming, ...current];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectIds]);

  const latestDeploymentsByProject = useMemo(() => {
    return deployments.reduce<Record<string, DeploymentRow>>((accumulator, deployment) => {
      if (!deployment.project_id) {
        return accumulator;
      }

      const existing = accumulator[deployment.project_id];
      if (
        !existing ||
        new Date(deployment.created_at).getTime() > new Date(existing.created_at).getTime()
      ) {
        accumulator[deployment.project_id] = deployment;
      }
      return accumulator;
    }, {});
  }, [deployments]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-line bg-surface p-6 shadow-[0_18px_60px_rgba(20,33,61,0.08)] dark:bg-surface/75 sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted">
          Run Console
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Live pipeline visibility across your active projects
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-muted sm:text-base">
          Watch ingest, analysis, code generation, testing, and deployment progress update
          in real time from one place. Deployment changes stream in from Supabase Realtime
          as your pipeline advances.
        </p>
      </section>

      {projects.length ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {projects.map((project) => {
            const deployment = latestDeploymentsByProject[project.id] ?? null;
            const steps = deriveSteps(project, deployment);

            return (
              <section
                key={project.id}
                className="rounded-[2rem] border border-line bg-surface p-6 shadow-[0_18px_60px_rgba(20,33,61,0.08)] dark:bg-surface/75"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                      Project pipeline
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                      {project.name}
                    </h2>
                    <p className="mt-3 break-all text-sm leading-7 text-muted">
                      {project.github_repo_url}
                    </p>
                  </div>

                  <Link
                    href={`/projects/${project.id}`}
                    className="inline-flex shrink-0 rounded-full border border-line px-5 py-3 text-sm font-semibold transition hover:border-accent hover:text-accent"
                  >
                    Open project
                  </Link>
                </div>

                <div className="mt-8 space-y-0">
                  {steps.map((step, index) => {
                    const styles = stepStyles(step.status);
                    const isLast = index === steps.length - 1;
                    return (
                      <div
                        key={step.key}
                        className={`relative pl-10 ${!isLast ? "pb-6" : ""}`}
                      >
                        {!isLast ? (
                          <span className="absolute left-[0.7rem] top-6 h-full w-px bg-line" />
                        ) : null}
                        <span
                          className={`absolute left-0 top-1.5 h-6 w-6 rounded-full border-4 border-background ${styles.dot}`}
                        />
                        <article
                          className={`rounded-[1.5rem] border p-4 transition ${styles.card}`}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold">{step.label}</p>
                              <p className="mt-2 text-sm leading-6 text-muted">
                                {step.description}
                              </p>
                            </div>
                            <span className="rounded-full border border-line px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                              {styles.label}
                            </span>
                          </div>
                          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted">
                            {step.meta}
                          </p>
                        </article>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <section className="rounded-[2rem] border border-dashed border-line bg-surface p-8 text-sm leading-7 text-muted dark:bg-surface/75">
          No projects are onboarded yet. Create a project first to watch the pipeline move
          through ingest, analysis, code, test, and deploy.
        </section>
      )}
    </div>
  );
}
