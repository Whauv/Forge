"use client";

import type { DeploymentRow } from "@/types/db";

type PipelineStatusBarProps = {
  deployment: Pick<DeploymentRow, "id" | "status" | "retry_count"> | null;
};

const steps = [
  { key: "coding", label: "Coding" },
  { key: "testing", label: "Testing" },
  { key: "passed", label: "Passed" },
  { key: "failed", label: "Failed" },
] as const;

export function PipelineStatusBar({ deployment }: PipelineStatusBarProps) {
  const activeStatus = deployment?.status ?? "pending";

  return (
    <div className="grid gap-3 md:grid-cols-4">
      {steps.map((step) => {
        const isActive = activeStatus === step.key;
        const isReached =
          step.key === "coding"
            ? ["coding", "testing", "passed", "failed", "deployed"].includes(activeStatus)
            : step.key === "testing"
              ? ["testing", "passed", "failed", "deployed"].includes(activeStatus)
              : step.key === "passed"
                ? ["passed", "deployed"].includes(activeStatus)
                : activeStatus === "failed";

        return (
          <div
            key={step.key}
            className={`rounded-2xl border px-4 py-4 transition ${
              isReached
                ? "border-accent bg-accent/10 text-foreground"
                : "border-line bg-surface text-muted dark:bg-surface/75"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className={`h-3 w-3 rounded-full ${
                    isActive ? "animate-pulse bg-accent" : isReached ? "bg-accent" : "bg-line"
                  }`}
                />
                <span className="text-sm font-semibold">{step.label}</span>
              </div>
              {step.key === "testing" && (deployment?.retry_count ?? 0) > 0 ? (
                <span className="rounded-full bg-background px-2.5 py-1 text-xs font-semibold text-muted dark:bg-background/40">
                  Retry {deployment?.retry_count}
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
