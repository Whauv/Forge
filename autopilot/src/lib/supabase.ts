import { cookies } from "next/headers";

import {
  createMiddlewareClient,
  createRouteHandlerClient,
  createServerComponentClient,
} from "@supabase/auth-helpers-nextjs";
import { type NextRequest, type NextResponse } from "next/server";

function assertSupabaseEnv() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable.",
    );
  }
}

export const createServerSupabaseClient = () => {
  assertSupabaseEnv();
  return createServerComponentClient({
    cookies,
  });
};

export const createRouteHandlerSupabaseClient = () => {
  assertSupabaseEnv();
  return createRouteHandlerClient({
    cookies,
  });
};

export const createMiddlewareSupabaseClient = (
  request: NextRequest,
  response: NextResponse,
) => {
  assertSupabaseEnv();
  return createMiddlewareClient({
    req: request,
    res: response,
  });
};
