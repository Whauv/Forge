"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ProgressBar } from "@/components/progress-bar";

type FormState = {
  name: string;
  githubRepoUrl: string;
  docUrls: string;
  problemDescription: string;
};

const initialState: FormState = {
  name: "",
  githubRepoUrl: "",
  docUrls: "",
  problemDescription: "",
};

export function ProjectOnboardingForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          github_repo_url: form.githubRepoUrl.trim(),
          doc_urls: form.docUrls
            .split(",")
            .map((url) => url.trim())
            .filter(Boolean),
          problem_description: form.problemDescription.trim(),
        }),
      });

      const data = (await response.json()) as { error?: string; project_id?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create project.");
      }

      router.push("/projects");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Failed to create project.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium text-foreground">
          Project Name
        </label>
        <input
          id="name"
          type="text"
          value={form.name}
          onChange={(event) => updateField("name", event.target.value)}
          className="w-full rounded-2xl border border-line bg-background/70 px-4 py-3 text-sm outline-none transition focus:border-accent dark:bg-background/35"
          placeholder="Acme release automation"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="githubRepoUrl" className="text-sm font-medium text-foreground">
          GitHub Repo URL
        </label>
        <input
          id="githubRepoUrl"
          type="url"
          value={form.githubRepoUrl}
          onChange={(event) => updateField("githubRepoUrl", event.target.value)}
          className="w-full rounded-2xl border border-line bg-background/70 px-4 py-3 text-sm outline-none transition focus:border-accent dark:bg-background/35"
          placeholder="https://github.com/org/repo"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="docUrls" className="text-sm font-medium text-foreground">
          Doc URLs
        </label>
        <input
          id="docUrls"
          type="text"
          value={form.docUrls}
          onChange={(event) => updateField("docUrls", event.target.value)}
          className="w-full rounded-2xl border border-line bg-background/70 px-4 py-3 text-sm outline-none transition focus:border-accent dark:bg-background/35"
          placeholder="https://docs.example.com, https://runbooks.example.com"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="problemDescription"
          className="text-sm font-medium text-foreground"
        >
          Problem Description
        </label>
        <textarea
          id="problemDescription"
          value={form.problemDescription}
          onChange={(event) => updateField("problemDescription", event.target.value)}
          className="min-h-36 w-full rounded-2xl border border-line bg-background/70 px-4 py-3 text-sm outline-none transition focus:border-accent dark:bg-background/35"
          placeholder="What should AutoPilot analyze or automate for this project?"
          required
        />
      </div>

      <ProgressBar active={isSubmitting} />

      {error ? <p className="text-sm text-red-600 dark:text-red-300">{error}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Creating project..." : "Create project"}
      </button>
    </form>
  );
}
