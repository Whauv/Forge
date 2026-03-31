import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

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

export const createBrowserSupabaseClient = () => {
  assertSupabaseEnv();
  return createClientComponentClient();
};
