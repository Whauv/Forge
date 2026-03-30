import { NextResponse } from "next/server";

import { createRouteHandlerSupabaseClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const supabase = createRouteHandlerSupabaseClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", url.origin));
}
