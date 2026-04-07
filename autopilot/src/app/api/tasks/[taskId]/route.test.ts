import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PATCH } from "@/app/api/tasks/[taskId]/route";
import { requireRouteSession } from "@/lib/server-access";

vi.mock("@/lib/server-access", () => ({
  requireRouteSession: vi.fn(),
}));

function createTaskSupabase(options: {
  task: { id: string } | null;
  fetchError?: { message: string } | null;
  updateError?: { message: string } | null;
}) {
  const maybeSingle = vi.fn(async () => ({
    data: options.task,
    error: options.fetchError ?? null,
  }));
  const eqForFetchUser = vi.fn(() => ({ maybeSingle }));
  const eqForFetchId = vi.fn(() => ({ eq: eqForFetchUser }));
  const select = vi.fn(() => ({ eq: eqForFetchId }));

  const eqForUpdate = vi.fn(async () => ({
    error: options.updateError ?? null,
  }));
  const update = vi.fn(() => ({ eq: eqForUpdate }));

  return {
    from: vi.fn((table: string) =>
      table === "tasks"
        ? {
            select,
            update,
          }
        : {},
    ),
  };
}

describe("PATCH /api/tasks/[taskId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for unauthenticated users", async () => {
    vi.mocked(requireRouteSession).mockResolvedValue({
      response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    });

    const response = await PATCH(
      new Request("http://localhost/api/tasks/task-1", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "approved" }),
      }),
      { params: { taskId: "task-1" } },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized." });
  });

  it("returns 404 when the task is not owned by the current user", async () => {
    const supabase = createTaskSupabase({ task: null });
    vi.mocked(requireRouteSession).mockResolvedValue({
      supabase: supabase as never,
      userId: "user-123",
    });

    const response = await PATCH(
      new Request("http://localhost/api/tasks/task-1", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "approved" }),
      }),
      { params: { taskId: "task-1" } },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Task not found." });
  });

  it("updates the task status for an owned task", async () => {
    const supabase = createTaskSupabase({ task: { id: "task-1" } });
    vi.mocked(requireRouteSession).mockResolvedValue({
      supabase: supabase as never,
      userId: "user-123",
    });

    const response = await PATCH(
      new Request("http://localhost/api/tasks/task-1", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "approved" }),
      }),
      { params: { taskId: "task-1" } },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "approved" });
  });
});
