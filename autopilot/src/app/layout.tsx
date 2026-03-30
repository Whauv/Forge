import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";

import { AppShell } from "@/components/app-shell";
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
      className={`${inter.variable} ${robotoMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AppShell user={user}>{children}</AppShell>
      </body>
    </html>
  );
}
