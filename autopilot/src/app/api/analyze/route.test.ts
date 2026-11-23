// @vitest-environment node
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/analyze/route";
import { getServerEnv } from "@/lib/env";
import { requireOwnedProjectForRoute } from "@/lib/server-access";

vi.mock("@/lib/env", () => ({ getServerEnv: vi.fn() }));
vi.mock("@/lib/server-access", () => ({ requireOwnedProjectForRoute: vi.fn() }));

function postRequest(body: unknown) {
  return new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/analyze", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerEnv).mockReturnValue({
      FORGE_BACKEND_URL: "http://backend",
    } as never);
  });

  it("returns 400 when project_id or query is missing", async () => {
    const response = await POST(postRequest({ project_id: "p1" }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "project_id and query are required.",
    });
  });

  it("propagates the ownership failure response", async () => {
    vi.mocked(requireOwnedProjectForRoute).mockResolvedValue({
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    } as never);

    const response = await POST(postRequest({ project_id: "p1", query: "why" }));
    expect(response.status).toBe(401);
  });

  it("returns 502 when the backend stream fails", async () => {
    vi.mocked(requireOwnedProjectForRoute).mockResolvedValue({
      supabase: {},
      userId: "u1",
      project: {},
    } as never);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, body: null, text: async () => "backend down" })),
    );

    const response = await POST(postRequest({ project_id: "p1", query: "why" }));
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "backend down" });
  });

  it("proxies the SSE stream on success", async () => {
    vi.mocked(requireOwnedProjectForRoute).mockResolvedValue({
      supabase: {},
      userId: "u1",
      project: {},
    } as never);
    const body = new ReadableStream();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, body })));

    const response = await POST(postRequest({ project_id: "p1", query: "why" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
  });
});
