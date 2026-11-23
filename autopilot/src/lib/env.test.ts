// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const REQUIRED = {
  NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
  RESEND_API_KEY: "resend",
  RESEND_FROM_EMAIL: "from@example.com",
};

describe("getServerEnv", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const [key, value] of Object.entries(REQUIRED)) {
      vi.stubEnv(key, value);
    }
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns all required values", async () => {
    vi.stubEnv("FORGE_BACKEND_URL", "http://custom-backend");
    const { getServerEnv } = await import("@/lib/env");
    const env = getServerEnv();
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe("service");
    expect(env.FORGE_BACKEND_URL).toBe("http://custom-backend");
  });

  it("falls back to the default backend URL", async () => {
    vi.stubEnv("FORGE_BACKEND_URL", "");
    const { getServerEnv } = await import("@/lib/env");
    expect(getServerEnv().FORGE_BACKEND_URL).toBe("http://127.0.0.1:8000");
  });

  it("throws when a required public env var is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    await expect(import("@/lib/env")).rejects.toThrow(
      /Missing required environment variable/,
    );
  });
});
