"use client";

import { useSidebarStore } from "@/stores/sidebar-store";
import { cn } from "@/lib/utils";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

interface DashboardShellProps {
  children: React.ReactNode;
  title?: string;
}

export function DashboardShell({
  children,
  title,
}: DashboardShellProps): React.ReactElement {
  const { collapsed } = useSidebarStore();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Topbar title={title} />
      <main
        className={cn(
          "min-h-screen pt-16 transition-all duration-300",
          collapsed ? "pl-[72px]" : "pl-[260px]",
        )}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
