import { NextResponse } from "next/server";

/** Standard JSON error response for route handlers. */
export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/** Normalize an unknown caught value into a user-facing message. */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
