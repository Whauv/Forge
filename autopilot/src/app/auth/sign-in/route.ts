import { NextResponse } from "next/server";

import { createRouteHandlerSupabaseClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const redirectTo = new URL("/auth/callback", url.origin).toString();
  const supabase = createRouteHandlerSupabaseClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo,
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(new URL("/login?error=oauth_start_failed", url.origin));
  }

  return NextResponse.redirect(data.url);
}
