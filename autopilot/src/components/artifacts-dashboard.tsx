"use client";

import { useEffect, useMemo, useState } from "react";
import DiffViewer from "react-diff-viewer";
import { useTheme } from "next-themes";

import { ApproveProceedButton } from "@/components/approve-proceed-button";
import { PipelineStatusBar } from "@/components/pipeline-status-bar";
import { TestOutputLog } from "@/components/test-output-log";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import type { CodeArtifactRow, DeploymentRow } from "@/types/db";

type ArtifactRecord = Pick<CodeArtifactRow, "id" | "file_path" | "unified_diff"> & {
  task: {
    title: string | null;
    description: string | null;
  } | null;
};

type ArtifactsDashboardProps = {
  projectId: string;
  artifacts: ArtifactRecord[];
  initialDeployments: DeploymentRow[];
};

function parseUnifiedDiff(diff: string) {
  const lines = diff.split("\n");
  const oldLines: string[] = [];
  const newLines: string[] = [];

  for (const line of lines) {
    if (
      line.startsWith("diff ") ||
      line.startsWith("index ") ||
      line.startsWith("---") ||
      line.startsWith("+++") ||
      line.startsWith("@@")
    ) {
      continue;
    }

    if (line.startsWith("+")) {
      oldLines.push("");
      newLines.push(line.slice(1));
    } else if (line.startsWith("-")) {
      oldLines.push(line.slice(1));
      newLines.push("");
    } else if (line.startsWith(" ")) {
      oldLines.push(line.slice(1));
      newLines.push(line.slice(1));
    } else {
      oldLines.push(line);
      newLines.push(line);
    }
  }

  return {
    oldValue: oldLines.join("\n"),
    newValue: newLines.join("\n"),
  };
}

export function ArtifactsDashboard({
  projectId,
  artifacts,
  initialDeployments,
}: ArtifactsDashboardProps) {
  const { resolvedTheme } = useTheme();
  const [deployments, setDeployments] = useState<DeploymentRow[]>(initialDeployments);

  const latestDeployment = useMemo(() => {
    return [...deployments].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0] ?? null;
  }, [deployments]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    const channel = supabase
      .channel(`project_${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "deployments",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          setDeployments((current) => {
            const incoming = payload.new as DeploymentRow;
            const existingIndex = current.findIndex((item) => item.id === incoming.id);
            if (existingIndex >= 0) {
              const next = [...current];
              next[existingIndex] = incoming;
              return next;
            }
            return [incoming, ...current];
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-line bg-surface p-8 shadow-[0_18px_60px_rgba(20,33,61,0.08)] dark:bg-surface/75">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-muted">
              Pipeline status
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">
              Review generated code and deployment status
            </h1>
          </div>
          <ApproveProceedButton deployment={latestDeployment} />
        </div>

        <div className="mt-8 space-y-5">
          <PipelineStatusBar deployment={latestDeployment} />
          <TestOutputLog deployment={latestDeployment} />
        </div>
      </section>

      <section className="space-y-5">
        {artifacts.length ? (
          artifacts.map((artifact) => {
            const parsed = parseUnifiedDiff(artifact.unified_diff);
            return (
              <article
                key={artifact.id}
                className="overflow-hidden rounded-[2rem] border border-line bg-surface shadow-[0_18px_60px_rgba(20,33,61,0.08)] dark:bg-surface/75"
              >
                <header className="border-b border-line px-6 py-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                    {artifact.task?.title ?? "Code artifact"}
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                    {artifact.file_path}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-muted">
                    {artifact.task?.description ?? "Generated diff for this task."}
                  </p>
                </header>

                <div className="overflow-x-auto">
                  <DiffViewer
                    oldValue={parsed.oldValue}
                    newValue={parsed.newValue}
                    splitView
                    useDarkTheme={resolvedTheme === "dark"}
                    hideLineNumbers={false}
                    showDiffOnly={false}
                  />
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-[2rem] border border-dashed border-line bg-surface p-8 text-sm leading-7 text-muted dark:bg-surface/75">
            No code artifacts are available for this project yet.
          </div>
        )}
      </section>
    </div>
  );
}
