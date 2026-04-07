import { redirect } from "next/navigation";

import { createServerSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams?: {
    error?: string;
  };
};

function errorMessage(errorCode: string | undefined) {
  switch (errorCode) {
    case "oauth_start_failed":
      return "GitHub sign-in could not be started. Check your Supabase provider settings.";
    case "oauth_callback_failed":
      return "GitHub sign-in returned without a usable session. Verify the callback URL and provider credentials.";
    default:
      return null;
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    redirect("/");
  }

  const authError = errorMessage(searchParams?.error);

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,_#10213e_0%,_#1f2f56_48%,_#ff7a18_140%)] px-6 py-10 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-8">
          <div className="inline-flex rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
            AutoPilot
          </div>
          <div className="space-y-5">
            <h1 className="max-w-3xl text-5xl font-semibold leading-tight tracking-tight">
              Turn GitHub repos into an AI-operated DevOps pipeline.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-white/72">
              Sign in with GitHub to ingest projects, stream AI analysis, review generated
              diffs, and monitor code-to-deploy execution in real time.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "SSE-streamed analysis",
              "Supabase Realtime status",
              "Diff review UX",
              "Vercel-ready deployment",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/12 bg-white/8 px-5 py-4 text-sm text-white/78"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/12 bg-white/10 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.25)] backdrop-blur">
          <h2 className="text-2xl font-semibold tracking-tight">Authenticate with GitHub</h2>
          <p className="mt-3 text-sm leading-7 text-white/70">
            Supabase handles the OAuth exchange. After login, every route except this page
            is protected by middleware.
          </p>
          {authError ? (
            <p className="mt-4 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm leading-7 text-white/85">
              {authError}
            </p>
          ) : null}
          <form action="/auth/sign-in" method="post" className="mt-8">
            <button className="inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-4 text-sm font-semibold text-[#10213e] transition hover:bg-[#ffe3d0]">
              Continue with GitHub
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
