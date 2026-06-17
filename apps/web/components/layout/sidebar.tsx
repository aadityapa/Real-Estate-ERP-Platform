"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Building2,
  HardHat,
  IndianRupee,
  UserCircle,
  FileText,
  Settings,
  Megaphone,
  Handshake,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME, NAV_ITEMS } from "@/lib/constants";
import { useSidebarStore } from "@/stores/sidebar-store";

const iconMap = {
  LayoutDashboard,
  Users,
  Building2,
  HardHat,
  IndianRupee,
  UserCircle,
  FileText,
  Settings,
  Megaphone,
  Handshake,
  Sparkles,
} as const;

function isChildActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isGroupActive(
  pathname: string,
  item: (typeof NAV_ITEMS)[number],
): boolean {
  if (item.href) return isChildActive(pathname, item.href);
  return (
    item.children?.some((child) => isChildActive(pathname, child.href)) ??
    false
  );
}

export function Sidebar(): React.ReactElement {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebarStore();
  const [expanded, setExpanded] = useState<string[]>([]);

  useEffect(() => {
    const activeGroups = NAV_ITEMS.filter(
      (item) => item.children && isGroupActive(pathname, item),
    ).map((item) => item.label);
    setExpanded((prev) => [...new Set([...prev, ...activeGroups])]);
  }, [pathname]);

  const toggleGroup = (label: string) => {
    setExpanded((prev) =>
      prev.includes(label)
        ? prev.filter((g) => g !== label)
        : [...prev, label],
    );
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col bg-primary text-white transition-all duration-300",
        collapsed ? "w-[72px]" : "w-[260px]",
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-slate-700 px-4">
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight">{APP_NAME}</span>
        )}
        <button
          type="button"
          onClick={toggle}
          className="rounded-lg p-1.5 hover:bg-slate-800"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => {
          const Icon = iconMap[item.icon as keyof typeof iconMap];

          if (item.children) {
            const groupActive = isGroupActive(pathname, item);
            const isOpen = expanded.includes(item.label);

            return (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={() => !collapsed && toggleGroup(item.label)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    groupActive
                      ? "bg-slate-800 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white",
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform",
                          isOpen && "rotate-180",
                        )}
                      />
                    </>
                  )}
                </button>

                {!collapsed && isOpen && (
                  <div className="ml-4 mt-1 space-y-0.5 border-l border-slate-700 pl-3">
                    {item.children.map((child) => {
                      const childActive = isChildActive(pathname, child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "block rounded-lg px-3 py-2 text-sm transition-colors",
                            childActive
                              ? "bg-accent text-white"
                              : "text-slate-400 hover:bg-slate-800 hover:text-white",
                          )}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const isActive = isChildActive(pathname, item.href!);

          return (
            <Link
              key={item.href}
              href={item.href!}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
