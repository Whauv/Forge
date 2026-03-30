"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "autopilot-theme";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextDark = storedTheme ? storedTheme === "dark" : prefersDark;
    document.documentElement.classList.toggle("dark", nextDark);
    setIsDark(nextDark);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    document.documentElement.classList.toggle("dark", nextDark);
    window.localStorage.setItem(STORAGE_KEY, nextDark ? "dark" : "light");
    setIsDark(nextDark);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-foreground transition hover:border-accent hover:text-accent dark:bg-background/60"
      aria-label="Toggle dark mode"
    >
      {isDark ? "Light mode" : "Dark mode"}
    </button>
  );
}
