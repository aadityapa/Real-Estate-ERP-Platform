"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

function currentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/**
 * Light/dark toggle. The initial theme is applied pre-hydration by the inline
 * script in the root layout, so this component only mirrors and flips it.
 */
export function ThemeToggle({
  className,
}: {
  className?: string;
}): React.JSX.Element {
  const [theme, setTheme] = React.useState<Theme>("light");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setTheme(currentTheme());
    setMounted(true);
  }, []);

  function toggle(): void {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("propos-theme", next);
    } catch {
      /* storage unavailable — theme simply won't persist */
    }
  }

  const isDark = mounted && theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light theme" : "Dark theme"}
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        className,
      )}
    >
      <Sun
        className={cn(
          "h-5 w-5 transition-all duration-200",
          isDark ? "scale-100 opacity-100" : "scale-75 opacity-0",
        )}
        aria-hidden
      />
      <Moon
        className={cn(
          "absolute h-5 w-5 transition-all duration-200",
          isDark ? "scale-75 opacity-0" : "scale-100 opacity-100",
        )}
        aria-hidden
      />
    </button>
  );
}
