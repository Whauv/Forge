import { cookies } from "next/headers";

import {
  createMiddlewareClient,
  createRouteHandlerClient,
  createServerComponentClient,
} from "@supabase/auth-helpers-nextjs";
import { type NextRequest, type NextResponse } from "next/server";
import { publicEnv } from "@/lib/env";

export const createServerSupabaseClient = () => {
  void publicEnv;
  return createServerComponentClient({
    cookies,
  });
};

export const createRouteHandlerSupabaseClient = () => {
  void publicEnv;
  return createRouteHandlerClient({
    cookies,
  });
};

export const createMiddlewareSupabaseClient = (
  request: NextRequest,
  response: NextResponse,
) => {
  void publicEnv;
  return createMiddlewareClient({
    req: request,
    res: response,
  });
};
