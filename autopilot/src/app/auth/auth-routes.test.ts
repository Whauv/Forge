// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as callbackGet } from "@/app/auth/callback/route";
import { POST as logoutPost } from "@/app/auth/logout/route";
import { POST as signInPost } from "@/app/auth/sign-in/route";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({ createRouteHandlerSupabaseClient: vi.fn() }));

function location(response: Response): string {
  return response.headers.get("location") ?? "";
}

describe("GET /auth/callback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exchanges the code and redirects to a safe next path", async () => {
    const exchangeCodeForSession = vi.fn(async () => ({ error: null }));
    vi.mocked(createRouteHandlerSupabaseClient).mockReturnValue({
      auth: { exchangeCodeForSession },
    } as never);

    const response = await callbackGet(
      new Request("http://localhost/auth/callback?code=abc&next=/projects"),
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(location(response)).toBe("http://localhost/projects");
  });

  it("rejects an unsafe open-redirect next path", async () => {
    vi.mocked(createRouteHandlerSupabaseClient).mockReturnValue({
      auth: { exchangeCodeForSession: vi.fn(async () => ({ error: null })) },
    } as never);

    const response = await callbackGet(
      new Request("http://localhost/auth/callback?code=abc&next=//evil.com"),
    );

    expect(location(response)).toBe("http://localhost/");
  });

  it("redirects to login on exchange error", async () => {
    vi.mocked(createRouteHandlerSupabaseClient).mockReturnValue({
      auth: { exchangeCodeForSession: vi.fn(async () => ({ error: { message: "bad" } })) },
    } as never);

    const response = await callbackGet(
      new Request("http://localhost/auth/callback?code=abc"),
    );

    expect(location(response)).toContain("/login?error=oauth_callback_failed");
  });
});

describe("POST /auth/sign-in", () => {
  beforeEach(() => vi.clearAllMocks());

  it("redirects to the provider URL", async () => {
    vi.mocked(createRouteHandlerSupabaseClient).mockReturnValue({
      auth: {
        signInWithOAuth: vi.fn(async () => ({
          data: { url: "https://github.com/login/oauth" },
          error: null,
        })),
      },
    } as never);

    const response = await signInPost(new Request("http://localhost/auth/sign-in", { method: "POST" }));

    expect(response.status).toBe(303);
    expect(location(response)).toBe("https://github.com/login/oauth");
  });

  it("redirects to login on provider error", async () => {
    vi.mocked(createRouteHandlerSupabaseClient).mockReturnValue({
      auth: {
        signInWithOAuth: vi.fn(async () => ({ data: { url: null }, error: { message: "no" } })),
      },
    } as never);

    const response = await signInPost(new Request("http://localhost/auth/sign-in", { method: "POST" }));

    expect(response.status).toBe(303);
    expect(location(response)).toContain("/login?error=oauth_start_failed");
  });
});

describe("POST /auth/logout", () => {
  beforeEach(() => vi.clearAllMocks());

  it("signs out and redirects to login", async () => {
    const signOut = vi.fn(async () => ({}));
    vi.mocked(createRouteHandlerSupabaseClient).mockReturnValue({
      auth: { signOut },
    } as never);

    const response = await logoutPost(new Request("http://localhost/auth/logout", { method: "POST" }));

    expect(signOut).toHaveBeenCalled();
    expect(location(response)).toBe("http://localhost/login");
  });
});
