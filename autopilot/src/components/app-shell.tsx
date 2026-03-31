"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";

type AppShellProps = {
  children: React.ReactNode;
  user: {
    email?: string;
    avatarUrl?: string;
    fullName?: string;
  } | null;
};

const navItems = [
  { href: "/projects", label: "Projects" },
  { href: "/console", label: "Run Console" },
  { href: "/history", label: "History" },
];

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login";
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  if (isAuthPage) {
    return <>{children}</>;
  }

  const initials =
    user?.fullName
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ||
    user?.email?.slice(0, 2).toUpperCase() ||
    "AP";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen md:grid-cols-[260px_1fr]">
        {isMenuOpen ? (
          <button
            type="button"
            aria-label="Close navigation menu"
            className="fixed inset-0 z-30 bg-[#14213d]/45 md:hidden"
            onClick={() => setIsMenuOpen(false)}
          />
        ) : null}

        <aside
          className={`fixed inset-y-0 left-0 z-40 w-[min(85vw,260px)] border-r border-line bg-surface px-6 py-8 transition-transform dark:bg-background/92 md:static md:w-auto md:translate-x-0 ${
            isMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="rounded-[1.75rem] bg-[linear-gradient(160deg,_rgba(255,122,24,0.12),_rgba(255,122,24,0.02))] p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-accent-strong">
              AutoPilot
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">
              DevOps command center
            </h1>
            <p className="mt-3 text-sm leading-7 text-muted">
              Stream AI execution, review generated work, and manage deployments from a
              single workspace.
            </p>
          </div>

          <nav className="mt-10 flex flex-col gap-2">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-accent text-white shadow-[0_12px_32px_rgba(255,122,24,0.26)]"
                      : "text-muted hover:bg-background hover:text-foreground dark:hover:bg-surface/80"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="border-b border-line bg-background/90 px-4 py-4 backdrop-blur dark:bg-background/80 sm:px-6 sm:py-5">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Open navigation menu"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-foreground transition hover:border-accent hover:text-accent md:hidden"
                  onClick={() => setIsMenuOpen(true)}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                </button>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">
                    Workspace
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
                    {navItems.find((item) => item.href === pathname)?.label ?? "Projects"}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <ThemeToggle />
                <div className="hidden items-center gap-3 rounded-full border border-line bg-surface px-3 py-2 dark:bg-background/60 sm:flex">
                  {user?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName ?? user.email ?? "User avatar"}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {user?.fullName ?? "Authenticated user"}
                    </p>
                    <p className="truncate text-xs text-muted">{user?.email ?? ""}</p>
                  </div>
                  <form action="/auth/logout" method="post">
                    <button className="rounded-full border border-line px-4 py-2 text-sm font-medium transition hover:border-accent hover:text-accent">
                      Logout
                    </button>
                  </form>
                </div>

                <form action="/auth/logout" method="post" className="sm:hidden">
                  <button className="rounded-full border border-line px-4 py-2 text-sm font-medium transition hover:border-accent hover:text-accent">
                    Logout
                  </button>
                </form>
              </div>
            </div>

            <div className="mx-auto mt-4 flex w-full max-w-7xl items-center gap-3 rounded-[1.5rem] border border-line bg-surface px-4 py-3 dark:bg-background/60 sm:hidden">
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt={user.fullName ?? user.email ?? "User avatar"}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">
                  Signed in
                </p>
                <p className="truncate text-sm font-semibold">
                  {user?.fullName ?? "Authenticated user"}
                </p>
                <p className="truncate text-xs text-muted">{user?.email ?? ""}</p>
              </div>
            </div>
          </header>

          <div className="flex-1 px-4 py-6 sm:px-6 sm:py-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
