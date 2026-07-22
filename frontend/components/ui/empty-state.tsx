import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** Optional illustrative icon (e.g. a lucide icon element). */
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** Primary recovery/creation action, shown only when provided (respect permissions upstream). */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Meaningful empty state: explains what's missing and offers the next step,
 * rather than a bare "No data".
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border-strong bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
