import { redirect } from "next/navigation";

import { ArtifactsDashboard } from "@/components/artifacts-dashboard";
import { createServerSupabaseClient } from "@/lib/supabase";

type ProjectArtifactsPageProps = {
  params: {
    id: string;
  };
};

export const dynamic = "force-dynamic";

export default async function ProjectArtifactsPage({
  params,
}: ProjectArtifactsPageProps) {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  const { data: artifacts, error: artifactError } = await supabase
    .from("code_artifacts")
    .select("id,file_path,unified_diff,task:tasks(title,description)")
    .eq("tasks.project_id", params.id)
    .order("created_at", { ascending: false });

  if (artifactError) {
    throw new Error(artifactError.message);
  }

  const { data: deployments, error: deploymentError } = await supabase
    .from("deployments")
    .select("*")
    .eq("project_id", params.id)
    .order("created_at", { ascending: false });

  if (deploymentError) {
    throw new Error(deploymentError.message);
  }

  return (
    <ArtifactsDashboard
      projectId={params.id}
      artifacts={(artifacts ?? []) as never[]}
      initialDeployments={(deployments ?? []) as never[]}
    />
  );
}
