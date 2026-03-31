"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DeploymentRecord = {
  id: string;
  status: string | null;
};

type ApproveProceedButtonProps = {
  deployment: DeploymentRecord | null;
};

export function ApproveProceedButton({ deployment }: ApproveProceedButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = !deployment || deployment.status !== "passed" || isSubmitting;

  const handleProceed = async () => {
    if (!deployment) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/deployments/${deployment.id}/proceed`, {
        method: "POST",
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to proceed with deployment.");
      }
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to proceed with deployment.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={disabled}
        onClick={handleProceed}
        className="inline-flex rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-55"
      >
        {isSubmitting ? "Proceeding..." : "Approve & Proceed"}
      </button>
      {error ? <p className="text-sm text-red-600 dark:text-red-300">{error}</p> : null}
    </div>
  );
}
