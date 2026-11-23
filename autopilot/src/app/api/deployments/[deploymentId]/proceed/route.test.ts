// @vitest-environment node
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/deployments/[deploymentId]/proceed/route";
import { sendPRCreatedEmail } from "@/lib/email";
import { requireRouteSession } from "@/lib/server-access";

vi.mock("@/lib/server-access", () => ({ requireRouteSession: vi.fn() }));
vi.mock("@/lib/email", () => ({ sendPRCreatedEmail: vi.fn() }));

type SupabaseOptions = {
  deployment: Record<string, unknown> | null;
  fetchError?: { message: string } | null;
  updateError?: { message: string } | null;
  email?: string | null;
};

function makeSupabase(opts: SupabaseOptions) {
  const maybeSingle = vi.fn(async () => ({
    data: opts.deployment,
    error: opts.fetchError ?? null,
  }));
  const returns = vi.fn(() => ({ maybeSingle }));
  const selectEq2 = vi.fn(() => ({ returns }));
  const selectEq1 = vi.fn(() => ({ eq: selectEq2 }));
  const select = vi.fn(() => ({ eq: selectEq1 }));
  const updateEq = vi.fn(async () => ({ error: opts.updateError ?? null }));
  const update = vi.fn(() => ({ eq: updateEq }));
  const getSession = vi.fn(async () => ({
    data: { session: opts.email ? { user: { email: opts.email } } : null },
  }));
  return {
    from: vi.fn(() => ({ select, update })),
    auth: { getSession },
  };
}

function request() {
  return new Request("http://localhost/api/deployments/d1/proceed", { method: "POST" });
}

const params = { params: { deploymentId: "d1" } };

describe("POST /api/deployments/[deploymentId]/proceed", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the 401 auth failure", async () => {
    vi.mocked(requireRouteSession).mockResolvedValue({
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    } as never);

    const response = await POST(request(), params);
    expect(response.status).toBe(401);
  });

  it("returns 404 when the deployment is not found", async () => {
    vi.mocked(requireRouteSession).mockResolvedValue({
      supabase: makeSupabase({ deployment: null }),
      userId: "u1",
    } as never);

    const response = await POST(request(), params);
    expect(response.status).toBe(404);
  });

  it("returns 400 when the deployment has not passed", async () => {
    vi.mocked(requireRouteSession).mockResolvedValue({
      supabase: makeSupabase({ deployment: { id: "d1", status: "failed" } }),
      userId: "u1",
    } as never);

    const response = await POST(request(), params);
    expect(response.status).toBe(400);
  });

  it("returns 500 when the update fails", async () => {
    vi.mocked(requireRouteSession).mockResolvedValue({
      supabase: makeSupabase({
        deployment: { id: "d1", status: "passed", pr_link: "http://pr" },
        updateError: { message: "update broke" },
      }),
      userId: "u1",
    } as never);

    const response = await POST(request(), params);
    expect(response.status).toBe(500);
  });

  it("deploys and emails on success", async () => {
    vi.mocked(requireRouteSession).mockResolvedValue({
      supabase: makeSupabase({
        deployment: { id: "d1", status: "passed", pr_link: "http://pr" },
        email: "dev@example.com",
      }),
      userId: "u1",
    } as never);

    const response = await POST(request(), params);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "deployed" });
    expect(sendPRCreatedEmail).toHaveBeenCalledWith("dev@example.com", "http://pr");
  });
});
