import type { DeploymentRow, DeploymentStatus, ProjectRow } from "@/types/db";

export type ConsoleProject = Pick<
  ProjectRow,
  "id" | "name" | "github_repo_url" | "created_at"
> & {
  taskCount: number;
  artifactCount: number;
};

export type PipelineStepStatus = "idle" | "running" | "success" | "failed";

export type PipelineStep = {
  key: "ingest" | "analyze" | "code" | "test" | "deploy";
  label: string;
  description: string;
  status: PipelineStepStatus;
  meta?: string;
};

export type StepStyle = {
  dot: string;
  card: string;
  label: string;
};

/**
 * Derive the five pipeline steps and their statuses for a project.
 * Extracted from run-console-dashboard so it can be unit-tested directly.
 */
export function deriveSteps(
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

export function stepStyles(status: PipelineStepStatus): StepStyle {
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
