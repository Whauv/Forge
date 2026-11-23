import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RunConsoleDashboard } from "@/components/run-console-dashboard";

vi.mock("@/lib/supabase-browser", () => ({
  createBrowserSupabaseClient: () => ({
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: vi.fn(),
  }),
}));

function project(overrides = {}) {
  return {
    id: "p1",
    name: "Forge",
    github_repo_url: "https://github.com/Whauv/Forge",
    created_at: "2025-01-01T00:00:00.000Z",
    taskCount: 2,
    artifactCount: 0,
    ...overrides,
  };
}

describe("RunConsoleDashboard", () => {
  it("renders the empty state with no projects", () => {
    render(<RunConsoleDashboard projects={[]} initialDeployments={[]} />);
    expect(screen.getByText(/No projects are onboarded yet/i)).toBeInTheDocument();
  });

  it("renders the five pipeline steps for a project", () => {
    render(<RunConsoleDashboard projects={[project()]} initialDeployments={[]} />);

    expect(screen.getByText("Forge")).toBeInTheDocument();
    for (const label of ["Ingest", "Analyze", "Code", "Test", "Deploy"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    // deriveSteps: taskCount 2 -> Analyze "success" + "2 tasks" meta
    expect(screen.getByText("2 tasks")).toBeInTheDocument();
  });
});
