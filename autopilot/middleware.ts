import { NextResponse, type NextRequest } from "next/server";

import { createMiddlewareSupabaseClient } from "@/lib/supabase";

// Single source of truth for which routes are reachable without a session.
const PUBLIC_PATHS = new Set(["/", "/login", "/auth/callback", "/auth/sign-in"]);
const PUBLIC_PREFIXES = ["/_next", "/favicon", "/public"];

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.has(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  );
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createMiddlewareSupabaseClient(request, response);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;

  if (!session && !isPublicPath(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
