"use client";

import * as React from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  /** When provided, renders a Retry button. */
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/**
 * Friendly, recoverable error surface. Never shows raw exception text; give the
 * user a clear action instead.
 */
export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this data. Please try again in a moment.",
  onRetry,
  retryLabel = "Retry",
  className,
}: ErrorStateProps): React.JSX.Element {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-danger/30 bg-danger-subtle px-6 py-12 text-center",
        className,
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="mt-5">
          <RotateCw className="h-4 w-4" aria-hidden />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
