"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  filters: {
    key: string;
    label: string;
    options: FilterOption[];
    value?: string;
    onChange: (value: string) => void;
  }[];
  search?: string;
  onSearchChange?: (value: string) => void;
  onClear?: () => void;
}

export function FilterBar({
  filters,
  search,
  onSearchChange,
  onClear,
}: FilterBarProps): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
      {onSearchChange && (
        <input
          type="search"
          placeholder="Search..."
          value={search ?? ""}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 min-w-[200px] flex-1 rounded-lg border border-border px-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
      )}
      {filters.map((filter) => (
        <select
          key={filter.key}
          value={filter.value ?? ""}
          onChange={(e) => filter.onChange(e.target.value)}
          className="h-9 rounded-lg border border-border bg-white px-3 text-sm outline-none focus:border-accent"
        >
          <option value="">{filter.label}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}
      {onClear && (
        <Button variant="outline" size="sm" onClick={onClear}>
          Clear
        </Button>
      )}
    </div>
  );
}

export function StatusBadge({
  status,
}: {
  status: string;
}): React.ReactElement {
  const colors: Record<string, string> = {
    NEW: "bg-blue-100 text-blue-700",
    CONTACTED: "bg-purple-100 text-purple-700",
    INTERESTED: "bg-indigo-100 text-indigo-700",
    SITE_VISIT: "bg-cyan-100 text-cyan-700",
    NEGOTIATION: "bg-amber-100 text-amber-700",
    BOOKING: "bg-emerald-100 text-emerald-700",
    AGREEMENT: "bg-green-100 text-green-700",
    LOST: "bg-red-100 text-red-700",
    AVAILABLE: "bg-emerald-100 text-emerald-700",
    BOOKED: "bg-amber-100 text-amber-700",
    SOLD: "bg-slate-100 text-slate-700",
    PENDING: "bg-amber-100 text-amber-700",
    APPROVED: "bg-emerald-100 text-emerald-700",
    ACTIVE: "bg-emerald-100 text-emerald-700",
    OPEN: "bg-blue-100 text-blue-700",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        colors[status] ?? "bg-slate-100 text-slate-700",
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
