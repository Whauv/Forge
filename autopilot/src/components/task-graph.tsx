"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  clarifying_question: string | null;
};

type TaskGraphProps = {
  tasks: Task[];
};

export function TaskGraph({ tasks }: TaskGraphProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sortedTasks = useMemo(() => tasks, [tasks]);

  const updateTaskStatus = async (taskId: string, status: "approved" | "rejected") => {
    setPendingTaskId(taskId);
    setError(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to update task.");
      }

      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Failed to update task.",
      );
    } finally {
      setPendingTaskId(null);
    }
  };

  return (
    <div className="space-y-5">
      {error ? <p className="text-sm text-red-600 dark:text-red-300">{error}</p> : null}

      {sortedTasks.length ? (
        sortedTasks.map((task) => {
          const answer = answers[task.id] ?? "";
          const approvalBlocked = Boolean(task.clarifying_question && !answer.trim());
          const isPending = pendingTaskId === task.id;

          return (
            <article
              key={task.id}
              className="rounded-[1.75rem] border border-line bg-surface p-6 shadow-[0_12px_36px_rgba(20,33,61,0.06)] dark:bg-surface/75"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">
                    {task.status ?? "pending"}
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight">{task.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-muted">
                    {task.description ?? "No description provided."}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={approvalBlocked || isPending}
                    onClick={() => updateTaskStatus(task.id, "approved")}
                    className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => updateTaskStatus(task.id, "rejected")}
                    className="rounded-full border border-line px-5 py-3 text-sm font-semibold transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              </div>

              {task.clarifying_question ? (
                <div className="mt-5 space-y-2 rounded-2xl border border-line bg-background/75 px-4 py-4 dark:bg-background/35">
                  <label
                    htmlFor={`clarify-${task.id}`}
                    className="text-sm font-medium text-foreground"
                  >
                    Clarifying question
                  </label>
                  <p className="text-sm leading-7 text-muted">{task.clarifying_question}</p>
                  <input
                    id={`clarify-${task.id}`}
                    type="text"
                    value={answer}
                    onChange={(event) =>
                      setAnswers((current) => ({
                        ...current,
                        [task.id]: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm outline-none transition focus:border-accent dark:bg-surface/70"
                    placeholder="Answer before approving this task"
                  />
                  {approvalBlocked ? (
                    <p className="text-xs font-medium text-muted">
                      Provide an answer before Approve is enabled.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })
      ) : (
        <div className="rounded-[1.75rem] border border-dashed border-line bg-surface p-8 text-sm leading-7 text-muted dark:bg-surface/75">
          No tasks have been generated for this project yet.
        </div>
      )}
    </div>
  );
}
