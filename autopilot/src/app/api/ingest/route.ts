import { NextResponse } from "next/server";

import { errorMessage, jsonError } from "@/lib/route-helpers";
import { requireRouteSession } from "@/lib/server-access";
import type { ProjectRow } from "@/types/db";

type IngestPayload = {
  name?: string;
  github_repo_url?: string;
  doc_urls?: string[];
  problem_description?: string;
};

function isValidUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRouteSession();
    if ("response" in auth) {
      return auth.response;
    }
    const { supabase, userId } = auth;

    const body = (await request.json()) as IngestPayload;
    const name = body.name?.trim() ?? "";
    const githubRepoUrl = body.github_repo_url?.trim() ?? "";
    const docUrls = Array.isArray(body.doc_urls)
      ? body.doc_urls.map((url) => url.trim()).filter(Boolean)
      : [];
    const problemDescription = body.problem_description?.trim() ?? "";

    if (!name) {
      return jsonError("Project name is required.", 400);
    }

    if (!githubRepoUrl || !isValidUrl(githubRepoUrl)) {
      return jsonError("A valid GitHub repo URL is required.", 400);
    }

    if (docUrls.some((url) => !isValidUrl(url))) {
      return jsonError("All document URLs must be valid URLs.", 400);
    }

    if (!problemDescription) {
      return jsonError("Problem description is required.", 400);
    }

    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: userId,
        name,
        github_repo_url: githubRepoUrl,
        doc_urls: docUrls,
        problem_description: problemDescription,
      })
      .select("id")
      .returns<Pick<ProjectRow, "id">[]>()
      .single();

    if (error || !data) {
      return jsonError(error?.message ?? "Failed to create project.", 500);
    }

    return NextResponse.json({ project_id: data.id });
  } catch (error) {
    return jsonError(errorMessage(error, "Unexpected ingestion error."), 500);
  }
}
