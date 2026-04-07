import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/ingest/route";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({
  createRouteHandlerSupabaseClient: vi.fn(),
}));

type MockSingleResult = {
  data: { id: string } | null;
  error: { message: string } | null;
};

function createAuthenticatedSupabase(result: MockSingleResult) {
  const single = vi.fn(async () => result);
  const returns = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ returns }));
  const insert = vi.fn(() => ({ select }));

  return {
    auth: {
      getSession: vi.fn(async () => ({
        data: {
          session: {
            user: {
              id: "user-123",
            },
          },
        },
      })),
    },
    from: vi.fn(() => ({ insert })),
  };
}

describe("POST /api/ingest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when there is no session", async () => {
    vi.mocked(createRouteHandlerSupabaseClient).mockReturnValue({
      auth: {
        getSession: vi.fn(async () => ({
          data: {
            session: null,
          },
        })),
      },
    } as never);

    const response = await POST(
      new Request("http://localhost/api/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Forge",
          github_repo_url: "https://github.com/Whauv/Forge",
          doc_urls: [],
          problem_description: "Audit the pipeline.",
        }),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized." });
  });

  it("creates a project record for an authenticated user", async () => {
    const supabase = createAuthenticatedSupabase({
      data: { id: "project-123" },
      error: null,
    });
    vi.mocked(createRouteHandlerSupabaseClient).mockReturnValue(supabase as never);

    const response = await POST(
      new Request("http://localhost/api/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Forge",
          github_repo_url: "https://github.com/Whauv/Forge",
          doc_urls: ["https://example.com/docs"],
          problem_description: "Audit the pipeline.",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ project_id: "project-123" });
    expect(supabase.from).toHaveBeenCalledWith("projects");
  });
});
