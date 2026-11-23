import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProjectRow } from "@/types/db";

export type OwnedProject = Pick<
  ProjectRow,
  "id" | "user_id" | "name" | "github_repo_url" | "problem_description" | "created_at"
>;

const OWNED_PROJECT_COLUMNS =
  "id,user_id,name,github_repo_url,problem_description,created_at";

/**
 * Load a project scoped to its owner. Shared by the redirect-based and
 * route-handler ownership guards so the column list lives in one place.
 */
export async function loadOwnedProject(
  supabase: SupabaseClient,
  projectId: string,
  userId: string,
): Promise<{ data: OwnedProject | null; error: { message: string } | null }> {
  return supabase
    .from("projects")
    .select(OWNED_PROJECT_COLUMNS)
    .eq("id", projectId)
    .eq("user_id", userId)
    .returns<OwnedProject[]>()
    .maybeSingle();
}
