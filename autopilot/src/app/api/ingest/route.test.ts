// @vitest-environment node
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/ingest/route";
import { requireRouteSession } from "@/lib/server-access";

vi.mock("@/lib/server-access", () => ({ requireRouteSession: vi.fn() }));

type InsertResult = {
  data: { id: string } | null;
  error: { message: string } | null;
};

function createSupabase(result: InsertResult) {
  const single = vi.fn(async () => result);
  const returns = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ returns }));
  const insert = vi.fn(() => ({ select }));
  return { from: vi.fn(() => ({ insert })) };
}

function authed(result: InsertResult) {
  const supabase = createSupabase(result);
  vi.mocked(requireRouteSession).mockResolvedValue({
    supabase: supabase as never,
    userId: "user-123",
  });
  return supabase;
}

function ingestRequest(body: unknown) {
  return new Request("http://localhost/api/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  name: "Forge",
  github_repo_url: "https://github.com/Whauv/Forge",
  doc_urls: ["https://example.com/docs"],
  problem_description: "Audit the pipeline.",
};

describe("POST /api/ingest", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when there is no session", async () => {
    vi.mocked(requireRouteSession).mockResolvedValue({
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    });

    const response = await POST(ingestRequest(validBody));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized." });
  });

  it("creates a project record for an authenticated user", async () => {
    const supabase = authed({ data: { id: "project-123" }, error: null });

    const response = await POST(ingestRequest(validBody));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ project_id: "project-123" });
    expect(supabase.from).toHaveBeenCalledWith("projects");
  });

  it("returns 400 when required fields are missing", async () => {
    const supabase = authed({ data: null, error: null });

    const response = await POST(
      ingestRequest({ name: "", github_repo_url: "", problem_description: "" }),
    );

    expect(response.status).toBe(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid repo URL", async () => {
    authed({ data: null, error: null });

    const response = await POST(
      ingestRequest({ name: "Forge", github_repo_url: "not-a-url", problem_description: "Audit." }),
    );

    expect(response.status).toBe(400);
  });

  it("returns 500 when the insert errors", async () => {
    authed({ data: null, error: { message: "insert failed" } });

    const response = await POST(
      ingestRequest({
        name: "Forge",
        github_repo_url: "https://github.com/Whauv/Forge",
        problem_description: "Audit.",
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "insert failed" });
  });
});
