// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  requireOwnedProjectForRoute,
  requireRouteSession,
} from "@/lib/server-access";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({
  createRouteHandlerSupabaseClient: vi.fn(),
  createServerSupabaseClient: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

function clientWithSession(session: unknown, project?: unknown, projectError?: unknown) {
  const maybeSingle = vi.fn(async () => ({ data: project ?? null, error: projectError ?? null }));
  const returns = vi.fn(() => ({ maybeSingle }));
  const eq2 = vi.fn(() => ({ returns }));
  const eq1 = vi.fn(() => ({ eq: eq2 }));
  const select = vi.fn(() => ({ eq: eq1 }));
  return {
    auth: { getSession: vi.fn(async () => ({ data: { session } })) },
    from: vi.fn(() => ({ select })),
  };
}

describe("requireRouteSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a 401 response when unauthenticated", async () => {
    vi.mocked(createRouteHandlerSupabaseClient).mockReturnValue(
      clientWithSession(null) as never,
    );

    const result = await requireRouteSession();
    expect("response" in result).toBe(true);
    if ("response" in result) {
      expect(result.response.status).toBe(401);
    }
  });

  it("returns supabase + userId when authenticated", async () => {
    vi.mocked(createRouteHandlerSupabaseClient).mockReturnValue(
      clientWithSession({ user: { id: "u1" } }) as never,
    );

    const result = await requireRouteSession();
    expect("response" in result).toBe(false);
    if (!("response" in result)) {
      expect(result.userId).toBe("u1");
    }
  });
});

describe("requireOwnedProjectForRoute", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the project when owned", async () => {
    vi.mocked(createRouteHandlerSupabaseClient).mockReturnValue(
      clientWithSession({ user: { id: "u1" } }, { id: "p1", user_id: "u1" }) as never,
    );

    const result = await requireOwnedProjectForRoute("p1");
    expect("response" in result).toBe(false);
    if (!("response" in result)) {
      expect(result.project.id).toBe("p1");
    }
  });

  it("returns 404 when the project is not found", async () => {
    vi.mocked(createRouteHandlerSupabaseClient).mockReturnValue(
      clientWithSession({ user: { id: "u1" } }, null) as never,
    );

    const result = await requireOwnedProjectForRoute("p1");
    expect("response" in result).toBe(true);
    if ("response" in result) {
      expect(result.response.status).toBe(404);
    }
  });

  it("returns 500 when the query errors", async () => {
    vi.mocked(createRouteHandlerSupabaseClient).mockReturnValue(
      clientWithSession({ user: { id: "u1" } }, null, { message: "db error" }) as never,
    );

    const result = await requireOwnedProjectForRoute("p1");
    expect("response" in result).toBe(true);
    if ("response" in result) {
      expect(result.response.status).toBe(500);
    }
  });
});
