import { NextResponse } from "next/server";

import { createRouteHandlerSupabaseClient } from "@/lib/supabase";

function getSafeRedirectPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const next = getSafeRedirectPath(url.searchParams.get("next"));

    if (code) {
      const supabase = createRouteHandlerSupabaseClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return NextResponse.redirect(
          new URL("/login?error=oauth_callback_failed", url.origin),
        );
      }
    }

    return NextResponse.redirect(new URL(next, url.origin));
  } catch {
    const url = new URL(request.url);
    return NextResponse.redirect(new URL("/login?error=oauth_callback_failed", url.origin));
  }
}
