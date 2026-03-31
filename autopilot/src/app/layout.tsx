import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";

import { AppShell } from "@/components/app-shell";
import { Providers } from "@/components/providers";
import { validateAppEnv } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AutoPilot",
  description: "AI-powered DevOps automation for GitHub projects.",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  validateAppEnv();
  const supabase = createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session
    ? {
        email: session.user.email,
        avatarUrl: session.user.user_metadata.avatar_url as string | undefined,
        fullName:
          (session.user.user_metadata.full_name as string | undefined) ||
          (session.user.user_metadata.user_name as string | undefined),
      }
    : null;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${robotoMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>
          <AppShell user={user}>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
