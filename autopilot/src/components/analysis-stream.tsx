"use client";

import { useState } from "react";

type StreamEvent = {
  type: "pain_point" | "solution";
  content: string;
};

type AnalysisStreamProps = {
  projectId: string;
};

export function AnalysisStream({ projectId }: AnalysisStreamProps) {
  const [query, setQuery] = useState("");
  const [painPoints, setPainPoints] = useState<string[]>([]);
  const [solutions, setSolutions] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsStreaming(true);
    setError(null);
    setPainPoints([]);
    setSolutions([]);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_id: projectId,
          query,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to start analysis stream.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const eventChunk of events) {
          const dataLine = eventChunk
            .split("\n")
            .find((line) => line.startsWith("data: "));
          if (!dataLine) {
            continue;
          }

          const payload = JSON.parse(dataLine.replace("data: ", "")) as StreamEvent;
          if (payload.type === "pain_point") {
            setPainPoints((current) => [...current, payload.content]);
          }
          if (payload.type === "solution") {
            setSolutions((current) => [...current, payload.content]);
          }
        }
      }
    } catch (streamError) {
      setError(
        streamError instanceof Error ? streamError.message : "Streaming analysis failed.",
      );
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label htmlFor="analysis-query" className="block text-sm font-medium text-foreground">
          Ask AutoPilot what to analyze
        </label>
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            id="analysis-query"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-2xl border border-line bg-background/70 px-4 py-3 text-sm outline-none transition focus:border-accent dark:bg-background/35"
            placeholder="What pain points or opportunities should we look for?"
            required
          />
          <button
            type="submit"
            disabled={isStreaming}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isStreaming ? "Analyzing..." : "Run analysis"}
          </button>
        </div>
      </form>

      {error ? <p className="text-sm text-red-600 dark:text-red-300">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[1.75rem] border border-line bg-surface p-6 dark:bg-surface/75">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted">
            Pain points
          </p>
          <div className="mt-4 space-y-4">
            {painPoints.length ? (
              painPoints.map((item, index) => (
                <article
                  key={`${item}-${index}`}
                  className="rounded-2xl border border-line bg-background/75 px-4 py-4 text-sm leading-7 text-muted dark:bg-background/35"
                >
                  {item}
                </article>
              ))
            ) : (
              <p className="text-sm leading-7 text-muted">
                Streamed pain points will appear here as the analysis response arrives.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-line bg-surface p-6 dark:bg-surface/75">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted">
            Solutions
          </p>
          <div className="mt-4 space-y-4">
            {solutions.length ? (
              solutions.map((item, index) => (
                <article
                  key={`${item}-${index}`}
                  className="rounded-2xl border border-line bg-[linear-gradient(180deg,_rgba(255,122,24,0.12),_rgba(255,122,24,0.02))] px-4 py-4 text-sm leading-7 text-foreground dark:bg-[linear-gradient(180deg,_rgba(255,155,82,0.16),_rgba(255,155,82,0.03))]"
                >
                  {item}
                </article>
              ))
            ) : (
              <p className="text-sm leading-7 text-muted">
                Streamed solution ideas will appear here as soon as they are emitted.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
