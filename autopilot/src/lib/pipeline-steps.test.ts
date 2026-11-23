import { describe, expect, it } from "vitest";

import { deriveSteps, stepStyles, type ConsoleProject } from "@/lib/pipeline-steps";
import type { DeploymentRow } from "@/types/db";

function project(overrides: Partial<ConsoleProject> = {}): ConsoleProject {
  return {
    id: "p1",
    name: "Forge",
    github_repo_url: "https://github.com/Whauv/Forge",
    created_at: "2025-01-01T00:00:00.000Z",
    taskCount: 0,
    artifactCount: 0,
    ...overrides,
  };
}

describe("deriveSteps", () => {
  it("marks ingest success and analyze idle with no activity", () => {
    const steps = deriveSteps(project(), null);
    const byKey = Object.fromEntries(steps.map((s) => [s.key, s]));

    expect(byKey.ingest.status).toBe("success");
    expect(byKey.analyze.status).toBe("idle");
    expect(byKey.analyze.meta).toBe("No tasks yet");
  });

  it("marks analyze success with tasks and pluralizes meta", () => {
    const steps = deriveSteps(project({ taskCount: 2 }), null);
    const analyze = steps.find((s) => s.key === "analyze");

    expect(analyze?.status).toBe("success");
    expect(analyze?.meta).toBe("2 tasks");
  });

  it("reflects deployment status in test/deploy steps", () => {
    const deployment = { status: "failed" } as DeploymentRow;
    const steps = deriveSteps(project({ taskCount: 1, artifactCount: 1 }), deployment);
    const byKey = Object.fromEntries(steps.map((s) => [s.key, s]));

    expect(byKey.test.status).toBe("failed");
    expect(byKey.deploy.status).toBe("failed");
  });
});

describe("stepStyles", () => {
  it("maps each status to a label", () => {
    expect(stepStyles("running").label).toBe("Running");
    expect(stepStyles("success").label).toBe("Success");
    expect(stepStyles("failed").label).toBe("Failed");
    expect(stepStyles("idle").label).toBe("Idle");
  });
});
