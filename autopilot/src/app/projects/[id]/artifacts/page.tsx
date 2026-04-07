import { redirect } from "next/navigation";

import { ArtifactsDashboard } from "@/components/artifacts-dashboard";
import { requireOwnedProjectOrRedirect } from "@/lib/server-access";
import type { CodeArtifactRow, DeploymentRow } from "@/types/db";

type ProjectArtifactsPageProps = {
  params: {
    id: string;
  };
};

export const dynamic = "force-dynamic";

type ArtifactWithTask = Pick<CodeArtifactRow, "id" | "file_path" | "unified_diff"> & {
  task: {
    title: string | null;
    description: string | null;
  } | null;
};

export default async function ProjectArtifactsPage({
  params,
}: ProjectArtifactsPageProps) {
  const { supabase } = await requireOwnedProjectOrRedirect(params.id);

  const { data: artifacts, error: artifactError } = await supabase
    .from("code_artifacts")
    .select("id,file_path,unified_diff,task:tasks(title,description)")
    .eq("tasks.project_id", params.id)
    .order("created_at", { ascending: false })
    .returns<ArtifactWithTask[]>();

  if (artifactError) {
    throw new Error(artifactError.message);
  }

  const { data: deployments, error: deploymentError } = await supabase
    .from("deployments")
    .select("*")
    .eq("project_id", params.id)
    .order("created_at", { ascending: false })
    .returns<DeploymentRow[]>();

  if (deploymentError) {
    throw new Error(deploymentError.message);
  }

  return (
    <ArtifactsDashboard
      projectId={params.id}
      artifacts={artifacts ?? []}
      initialDeployments={deployments ?? []}
    />
  );
}
