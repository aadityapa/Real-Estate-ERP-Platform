"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Search, UserCircle } from "lucide-react";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useAuthStore } from "@/stores/auth-store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface TopbarProps {
  title?: string;
}

export function Topbar({ title = "Dashboard" }: TopbarProps): React.ReactElement {
  const router = useRouter();
  const { collapsed } = useSidebarStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "U"
    : "U";

  // Close the account menu on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(e: MouseEvent): void {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  async function handleLogout(): Promise<void> {
    try {
      // Best effort — revoke the server-side session (stored as SHA-256 hash)
      await api.post("/auth/logout", {});
    } catch {
      // Session cleanup failures must never block a local sign-out
    }
    logout();
    router.replace("/login");
  }

  return (
    <header
      className={cn(
        "fixed right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-6 transition-all duration-300",
        collapsed ? "left-[72px]" : "left-[260px]",
      )}
    >
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>

      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search..."
            aria-label="Search"
            className="h-9 w-64 rounded-lg border border-border bg-slate-50 pl-9 pr-4 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>

        <button
          type="button"
          className="relative rounded-lg p-2 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-slate-600" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-label="Account menu"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {initials}
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-11 z-50 min-w-[220px] rounded-xl border border-border bg-card p-1.5 shadow-lg"
            >
              <div className="flex items-center gap-3 px-3 py-2.5">
                <UserCircle className="h-8 w-8 text-slate-400" aria-hidden />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {user ? `${user.firstName} ${user.lastName}` : "Signed in"}
                  </p>
                  <p className="truncate text-xs text-slate-500">{user?.email}</p>
                </div>
              </div>
              <div className="my-1 h-px bg-border" role="separator" />
              <button
                type="button"
                role="menuitem"
                onClick={() => void handleLogout()}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-danger transition-colors hover:bg-red-50 focus-visible:bg-red-50 focus-visible:outline-none"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
