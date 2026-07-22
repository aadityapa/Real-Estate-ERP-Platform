"use client";

import { AlertCircle, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaginationMeta } from "@/lib/types/api";

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  meta?: PaginationMeta;
  onPageChange?: (page: number) => void;
}

function SkeletonRows({ columns }: { columns: number }): React.ReactElement {
  return (
    <>
      {Array.from({ length: 6 }).map((_, r) => (
        <tr key={r} className="border-b border-border last:border-0">
          {Array.from({ length: columns }).map((_, c) => (
            <td key={c} className="px-4 py-3.5">
              <div
                className="h-4 animate-pulse rounded bg-slate-100"
                style={{ width: `${55 + ((r * 7 + c * 13) % 40)}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  loading,
  error,
  onRetry,
  emptyMessage = "No records found",
  onRowClick,
  meta,
  onPageChange,
}: DataTableProps<T>): React.ReactElement {
  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50/50 p-10 text-center"
      >
        <AlertCircle className="h-8 w-8 text-danger" aria-hidden />
        <div>
          <p className="font-medium text-slate-900">Something went wrong</p>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  if (!loading && !data.length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card p-12 text-center text-slate-500">
        <Inbox className="h-8 w-8 text-slate-300" aria-hidden />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  const showPagination = meta && meta.totalPages > 1 && onPageChange;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-busy={loading || undefined}>
          <thead>
            <tr className="border-b border-border bg-slate-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn(
                    "px-4 py-3 text-left font-medium text-slate-600",
                    col.className,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows columns={columns.length} />
            ) : (
              data.map((row) => (
                <tr
                  key={row.id}
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={
                    onRowClick
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                  className={cn(
                    "border-b border-border last:border-0 transition-colors",
                    onRowClick &&
                      "cursor-pointer hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none",
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-4 py-3", col.className)}>
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showPagination && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-slate-600"
        >
          <span>
            Page {meta.page} of {meta.totalPages}
            <span className="hidden sm:inline"> · {meta.total} records</span>
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onPageChange(meta.page - 1)}
              disabled={meta.page <= 1}
              aria-label="Previous page"
              className="rounded-lg border border-border p-1.5 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => onPageChange(meta.page + 1)}
              disabled={meta.page >= meta.totalPages}
              aria-label="Next page"
              className="rounded-lg border border-border p-1.5 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
