import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TaskGraph } from "@/components/task-graph";
import type { TaskRow } from "@/types/db";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

function task(overrides: Partial<TaskRow> = {}): TaskRow {
  return {
    id: "t1",
    title: "Add caching",
    description: "Introduce a cache layer",
    status: "planned",
    clarifying_question: null,
    ...overrides,
  } as unknown as TaskRow;
}

describe("TaskGraph", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the empty state when there are no tasks", () => {
    render(<TaskGraph tasks={[]} />);
    expect(screen.getByText(/No tasks have been generated/i)).toBeInTheDocument();
  });

  it("renders a task and approves it via the API", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({}) })));

    render(<TaskGraph tasks={[task()]} />);
    expect(screen.getByText("Add caching")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/tasks/t1",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
    expect(refresh).toHaveBeenCalled();
  });

  it("disables Approve until a clarifying question is answered", () => {
    render(<TaskGraph tasks={[task({ clarifying_question: "Which cache?" })]} />);

    const approve = screen.getByRole("button", { name: "Approve" });
    expect(approve).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Clarifying question"), {
      target: { value: "Redis" },
    });
    expect(approve).toBeEnabled();
  });
});
