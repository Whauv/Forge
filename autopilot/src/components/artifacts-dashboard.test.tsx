import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ArtifactsDashboard } from "@/components/artifacts-dashboard";

// Heavy / environment deps are stubbed so the test focuses on the component's
// own rendering (incl. the internal parseUnifiedDiff that feeds the viewer).
vi.mock("react-diff-viewer", () => ({ default: () => <div data-testid="diff" /> }));
vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/supabase-browser", () => ({
  createBrowserSupabaseClient: () => ({
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
    removeChannel: vi.fn(),
  }),
}));

describe("ArtifactsDashboard", () => {
  it("shows the empty state when there are no artifacts", () => {
    render(<ArtifactsDashboard projectId="p1" artifacts={[]} initialDeployments={[]} />);
    expect(screen.getByText(/No code artifacts are available/i)).toBeInTheDocument();
  });

  it("renders an artifact card with its file path and a diff", () => {
    const artifacts = [
      {
        id: "a1",
        file_path: "app/main.py",
        unified_diff: "@@ -1 +1 @@\n-old\n+new\n context",
        task: { title: "Refactor", description: "tidy up" },
      },
    ];

    render(
      <ArtifactsDashboard projectId="p1" artifacts={artifacts} initialDeployments={[]} />,
    );

    expect(screen.getByText("app/main.py")).toBeInTheDocument();
    expect(screen.getByTestId("diff")).toBeInTheDocument();
  });
});
