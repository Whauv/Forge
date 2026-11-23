import { describe, expect, it } from "vitest";

import { parseUnifiedDiff } from "@/lib/diff";

describe("parseUnifiedDiff", () => {
  it("aligns added, removed, context and plain lines", () => {
    const diff = ["@@ -1 +1 @@", "-old line", "+new line", " context"].join("\n");
    const { oldValue, newValue } = parseUnifiedDiff(diff);

    expect(oldValue).toBe(["old line", "", "context"].join("\n"));
    expect(newValue).toBe(["", "new line", "context"].join("\n"));
  });

  it("skips diff metadata headers", () => {
    const diff = [
      "diff --git a/x b/x",
      "index 111..222 100644",
      "--- a/x",
      "+++ b/x",
      "+only new",
    ].join("\n");

    const { oldValue, newValue } = parseUnifiedDiff(diff);
    expect(oldValue).toBe("");
    expect(newValue).toBe("only new");
  });
});
