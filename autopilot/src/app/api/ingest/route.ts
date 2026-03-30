import { NextResponse } from "next/server";

import { createRouteHandlerSupabaseClient } from "@/lib/supabase";

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
    const supabase = createRouteHandlerSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as IngestPayload;
    const name = body.name?.trim() ?? "";
    const githubRepoUrl = body.github_repo_url?.trim() ?? "";
    const docUrls = Array.isArray(body.doc_urls)
      ? body.doc_urls.map((url) => url.trim()).filter(Boolean)
      : [];
    const problemDescription = body.problem_description?.trim() ?? "";

    if (!name) {
      return NextResponse.json({ error: "Project name is required." }, { status: 400 });
    }

    if (!githubRepoUrl || !isValidUrl(githubRepoUrl)) {
      return NextResponse.json(
        { error: "A valid GitHub repo URL is required." },
        { status: 400 },
      );
    }

    if (docUrls.some((url) => !isValidUrl(url))) {
      return NextResponse.json(
        { error: "All document URLs must be valid URLs." },
        { status: 400 },
      );
    }

    if (!problemDescription) {
      return NextResponse.json(
        { error: "Problem description is required." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: session.user.id,
        name,
        github_repo_url: githubRepoUrl,
        doc_urls: docUrls,
        problem_description: problemDescription,
      })
      .select("id")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Failed to create project." },
        { status: 500 },
      );
    }

    return NextResponse.json({ project_id: data.id });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected ingestion error.",
      },
      { status: 500 },
    );
  }
}
