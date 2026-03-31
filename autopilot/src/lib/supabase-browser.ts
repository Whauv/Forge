import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { publicEnv } from "@/lib/env";

export const createBrowserSupabaseClient = () => {
  void publicEnv;
  return createClientComponentClient();
};
