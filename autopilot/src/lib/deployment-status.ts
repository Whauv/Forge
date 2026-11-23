/**
 * Badge classes for a deployment status, used by the history table.
 *
 * Note: the run-console step styling (`stepStyles` in pipeline-steps) and the
 * pipeline-status-bar "reached" logic operate on different inputs (derived
 * pipeline-step status and a fixed step list), so they are intentionally not
 * collapsed into this single map.
 */
export function deploymentStatusBadgeClasses(status: string | null): string {
  switch (status) {
    case "deployed":
    case "passed":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
    case "failed":
      return "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300";
    case "testing":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
    case "coding":
      return "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300";
    default:
      return "bg-zinc-100 text-zinc-700 dark:bg-white/10 dark:text-zinc-300";
  }
}
