import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProjectOnboardingForm } from "@/components/project-onboarding-form";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText("Project Name"), {
    target: { value: "Forge" },
  });
  fireEvent.change(screen.getByLabelText("GitHub Repo URL"), {
    target: { value: "https://github.com/Whauv/Forge" },
  });
  fireEvent.change(screen.getByLabelText("Problem Description"), {
    target: { value: "Audit the pipeline." },
  });
}

describe("ProjectOnboardingForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("submits and navigates to /projects on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ project_id: "p1" }) })),
    );

    render(<ProjectOnboardingForm />);
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /create project/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/projects"));
    expect(global.fetch).toHaveBeenCalledWith("/api/ingest", expect.objectContaining({ method: "POST" }));
  });

  it("shows the error message when the request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, json: async () => ({ error: "Name taken" }) })),
    );

    render(<ProjectOnboardingForm />);
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /create project/i }));

    expect(await screen.findByText("Name taken")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
