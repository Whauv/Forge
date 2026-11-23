import { describe, expect, it } from "vitest";

import { deploymentStatusBadgeClasses } from "@/lib/deployment-status";

describe("deploymentStatusBadgeClasses", () => {
  it("uses emerald for passed/deployed", () => {
    expect(deploymentStatusBadgeClasses("passed")).toContain("emerald");
    expect(deploymentStatusBadgeClasses("deployed")).toContain("emerald");
  });

  it("uses rose for failed and amber for testing", () => {
    expect(deploymentStatusBadgeClasses("failed")).toContain("rose");
    expect(deploymentStatusBadgeClasses("testing")).toContain("amber");
  });

  it("falls back to a neutral style", () => {
    expect(deploymentStatusBadgeClasses(null)).toContain("zinc");
    expect(deploymentStatusBadgeClasses("pending")).toContain("zinc");
  });
});
