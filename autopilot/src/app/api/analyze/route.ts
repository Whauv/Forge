import { NextResponse } from "next/server";

import { getServerEnv } from "@/lib/env";
import { requireOwnedProjectForRoute } from "@/lib/server-access";

type AnalyzePayload = {
  project_id?: string;
  query?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzePayload;
    const projectId = body.project_id?.trim();
    const query = body.query?.trim();

    if (!projectId || !query) {
      return NextResponse.json(
        { error: "project_id and query are required." },
        { status: 400 },
      );
    }

    const projectResult = await requireOwnedProjectForRoute(projectId);
    if ("response" in projectResult) {
      return projectResult.response;
    }

    const { FORGE_BACKEND_URL } = getServerEnv();
    const backendResponse = await fetch(`${FORGE_BACKEND_URL}/analyze/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        project_id: projectId,
        query,
      }),
      cache: "no-store",
    });

    if (!backendResponse.ok || !backendResponse.body) {
      const message = await backendResponse.text();
      return NextResponse.json(
        { error: message || "Failed to start backend analysis stream." },
        { status: 502 },
      );
    }

    return new Response(backendResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected analysis error." },
      { status: 500 },
    );
  }
}
