import { redirect } from "next/navigation";

import { RunConsoleDashboard } from "@/components/run-console-dashboard";
import { requireServerSessionOrRedirect } from "@/lib/server-access";
import type { DeploymentRow, ProjectRow, TaskRow } from "@/types/db";

export const dynamic = "force-dynamic";

type ArtifactProjectRef = {
  task: { project_id: string | null } | { project_id: string | null }[] | null;
};

export default async function ConsolePage() {
  const { supabase, session } = await requireServerSessionOrRedirect();

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("id,name,github_repo_url,created_at")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .returns<Pick<ProjectRow, "id" | "name" | "github_repo_url" | "created_at">[]>();

  if (projectsError) {
    throw new Error(projectsError.message);
  }

  const projectIds = (projects ?? []).map((project) => project.id);

  const { data: tasks, error: tasksError } = projectIds.length
    ? await supabase
        .from("tasks")
        .select("project_id")
        .in("project_id", projectIds)
        .returns<Pick<TaskRow, "project_id">[]>()
    : { data: [], error: null };

  if (tasksError) {
    throw new Error(tasksError.message);
  }

  const { data: artifacts, error: artifactsError } = projectIds.length
    ? await supabase
        .from("code_artifacts")
        .select("task:tasks(project_id)")
        .in("tasks.project_id", projectIds)
        .returns<ArtifactProjectRef[]>()
    : { data: [], error: null };

  if (artifactsError) {
    throw new Error(artifactsError.message);
  }

  const { data: deployments, error: deploymentsError } = projectIds.length
    ? await supabase
        .from("deployments")
        .select("*")
        .in("project_id", projectIds)
        .order("created_at", { ascending: false })
        .returns<DeploymentRow[]>()
    : { data: [], error: null };

  if (deploymentsError) {
    throw new Error(deploymentsError.message);
  }

  const taskCounts = (tasks ?? []).reduce<Record<string, number>>((accumulator, task) => {
    if (!task.project_id) {
      return accumulator;
    }
    accumulator[task.project_id] = (accumulator[task.project_id] ?? 0) + 1;
    return accumulator;
  }, {});

  const artifactCounts = (artifacts ?? []).reduce<Record<string, number>>(
    (accumulator, artifact) => {
      const taskProject = Array.isArray(artifact.task) ? artifact.task[0] : artifact.task;
      if (!taskProject?.project_id) {
        return accumulator;
      }
      accumulator[taskProject.project_id] =
        (accumulator[taskProject.project_id] ?? 0) + 1;
      return accumulator;
    },
    {},
  );

  const normalizedProjects = (projects ?? []).map((project) => ({
    ...project,
    taskCount: taskCounts[project.id] ?? 0,
    artifactCount: artifactCounts[project.id] ?? 0,
  }));

  return (
    <RunConsoleDashboard
      projects={normalizedProjects}
      initialDeployments={deployments ?? []}
    />
  );
}
