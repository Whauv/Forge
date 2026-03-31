import { NextResponse } from "next/server";

type AnalyzePayload = {
  project_id?: string;
  query?: string;
};

const encoder = new TextEncoder();

function event(data: { type: "pain_point" | "solution"; content: string }) {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: Request) {
  const body = (await request.json()) as AnalyzePayload;
  const projectId = body.project_id?.trim();
  const query = body.query?.trim();

  if (!projectId || !query) {
    return NextResponse.json(
      { error: "project_id and query are required." },
      { status: 400 },
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const mockEvents = [
        {
          type: "pain_point" as const,
          content: "Repository onboarding lacks a shared source of truth for project context.",
        },
        {
          type: "pain_point" as const,
          content: "Execution status is difficult to follow without a streaming analysis surface.",
        },
        {
          type: "solution" as const,
          content: `Create a project-specific analysis stream for queries like "${query}" so users can watch findings arrive live.`,
        },
        {
          type: "solution" as const,
          content: "Attach generated tasks to the project and route approvals through a dedicated task graph view.",
        },
      ];

      // TODO: Replace these mock events with the real AI backend stream.
      for (const item of mockEvents) {
        controller.enqueue(event(item));
        await new Promise((resolve) => setTimeout(resolve, 700));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
