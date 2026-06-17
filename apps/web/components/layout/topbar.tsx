"use client";

import { Bell, Search } from "lucide-react";
import { useSidebarStore } from "@/stores/sidebar-store";
import { cn } from "@/lib/utils";

interface TopbarProps {
  title?: string;
}

export function Topbar({ title = "Dashboard" }: TopbarProps): React.ReactElement {
  const { collapsed } = useSidebarStore();

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
            className="h-9 w-64 rounded-lg border border-border bg-slate-50 pl-9 pr-4 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>

        <button
          type="button"
          className="relative rounded-lg p-2 hover:bg-slate-100"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-slate-600" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" />
        </button>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-medium text-white">
          AD
        </div>
      </div>
    </header>
  );
}
