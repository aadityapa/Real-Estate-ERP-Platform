import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Layout-matching loading placeholder. Uses the shimmer keyframes defined in
 * globals.css; automatically stills under prefers-reduced-motion.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-md bg-muted animate-shimmer",
        className,
      )}
      {...props}
    />
  );
}
