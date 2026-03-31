"use client";

import type { DeploymentRow } from "@/types/db";

type TestOutputLogProps = {
  deployment: Pick<DeploymentRow, "test_output"> | null;
};

export function TestOutputLog({ deployment }: TestOutputLogProps) {
  return (
    <details className="rounded-[1.75rem] border border-line bg-surface p-6 dark:bg-surface/75">
      <summary className="cursor-pointer text-sm font-semibold text-foreground">
        Test output log
      </summary>
      <pre className="mt-4 overflow-x-auto rounded-2xl border border-line bg-background/80 p-4 text-xs leading-6 text-muted dark:bg-background/35">
        {deployment?.test_output?.trim() || "No test output available for this deployment."}
      </pre>
    </details>
  );
}
