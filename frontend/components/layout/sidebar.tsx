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
  Target,
  Headphones,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME, NAV_ITEMS, type NavItem } from "@/lib/constants";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useAuthStore } from "@/stores/auth-store";

function filterNavByTabs(items: NavItem[], allowedTabs?: string[]): NavItem[] {
  if (!allowedTabs || allowedTabs.includes("*")) return items;

  const tabRouteMap: Record<string, string[]> = {
    lms: ["/lms"],
    leads: ["/lms/leads", "/crm/leads"],
    appointments: ["/lms/appointments"],
    "site-visits": ["/lms/site-visits", "/crm/site-visits"],
    "data-feed": ["/lms/data-feed"],
    reports: ["/lms/reports"],
    goals: ["/lms/goals"],
    support: ["/support"],
    crm: ["/crm"],
    sales: ["/sales"],
    construction: ["/construction"],
    finance: ["/finance", "/vendors", "/procurement"],
    hr: ["/hr"],
    admin: ["/admin"],
  };

  const allowedPrefixes = new Set<string>();
  for (const tab of allowedTabs) {
    const routes = tabRouteMap[tab] ?? [`/${tab}`];
    routes.forEach((r) => allowedPrefixes.add(r));
  }

  return items
    .map((item) => {
      if (item.href) {
        const ok = [...allowedPrefixes].some(
          (p) => item.href === p || item.href?.startsWith(`${p}/`),
        );
        return ok ? item : null;
      }
      if (item.children) {
        const children = item.children.filter((c) =>
          [...allowedPrefixes].some(
            (p) => c.href === p || c.href.startsWith(`${p}/`),
          ),
        );
        return children.length > 0 ? { ...item, children } : null;
      }
      return item;
    })
    .filter((item): item is NavItem => item !== null);
}

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
  Target,
  Headphones,
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
    item.children?.some((child) => isChildActive(pathname, child.href)) ?? false
  );
}

export function Sidebar(): React.ReactElement {
  const pathname = usePathname();
  const { collapsed, toggle, mobileOpen, closeMobile } = useSidebarStore();
  const allowedTabs = useAuthStore((s) => s.user?.allowedTabs);
  const navItems = filterNavByTabs(NAV_ITEMS, allowedTabs);
  const [expanded, setExpanded] = useState<string[]>([]);

  useEffect(() => {
    const activeGroups = navItems
      .filter((item) => item.children && isGroupActive(pathname, item))
      .map((item) => item.label);
    setExpanded((prev) => [...new Set([...prev, ...activeGroups])]);
  }, [pathname, navItems]);

  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") closeMobile();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen, closeMobile]);

  const toggleGroup = (label: string): void => {
    setExpanded((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label],
    );
  };

  return (
    <>
      <div
        aria-hidden
        onClick={closeMobile}
        className={cn(
          "fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        aria-label="Primary"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen w-[260px] flex-col bg-primary text-white transition-transform duration-300",
          "lg:z-40 lg:transition-all",
          collapsed ? "lg:w-[72px]" : "lg:w-[260px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-700 px-4">
          {!collapsed && (
            <span className="text-lg font-bold tracking-tight">{APP_NAME}</span>
          )}
          <button
            type="button"
            onClick={toggle}
            className="hidden rounded-lg p-1.5 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:block"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
          <button
            type="button"
            onClick={closeMobile}
            className="rounded-lg p-1.5 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap];

            if (item.children) {
              const groupActive = isGroupActive(pathname, item);
              const isOpen = expanded.includes(item.label);

              return (
                <div key={item.label}>
                  <button
                    type="button"
                    onClick={() => !collapsed && toggleGroup(item.label)}
                    aria-expanded={isOpen}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                      groupActive
                        ? "bg-slate-800 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white",
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" aria-hidden />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            isOpen && "rotate-180",
                          )}
                          aria-hidden
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
                            aria-current={childActive ? "page" : undefined}
                            className={cn(
                              "block rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
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
                aria-current={isActive ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  isActive
                    ? "bg-accent text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
