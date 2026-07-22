import * as React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card } from "./card";
import { Skeleton } from "./skeleton";
import { cn } from "@/lib/utils";

type Intent = "neutral" | "primary" | "success" | "warning" | "danger";

const intentIconChip: Record<Intent, string> = {
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-success-subtle text-success",
  warning: "bg-warning-subtle text-warning",
  danger: "bg-danger-subtle text-danger",
};

interface StatCardProps {
  label: string;
  /** Preformatted value (currency/number/percent formatting done by the caller). */
  value: string;
  /** Signed percentage change; sign selects the up/down/flat treatment. */
  trend?: number;
  hint?: string;
  icon?: React.ReactNode;
  intent?: Intent;
  className?: string;
}

export function StatCard({
  label,
  value,
  trend,
  hint = "vs last month",
  icon,
  intent = "neutral",
  className,
}: StatCardProps): React.JSX.Element {
  const hasTrend = typeof trend === "number";
  const isUp = hasTrend && trend! > 0;
  const isDown = hasTrend && trend! < 0;
  const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

  return (
    <Card
      className={cn("p-5 transition-shadow duration-200 hover:shadow-md", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon && (
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              intentIconChip[intent],
            )}
            aria-hidden
          >
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-foreground tabular-nums">
        {value}
      </p>
      {hasTrend && (
        <div className="mt-2 flex items-center gap-1.5 text-xs font-medium">
          <span
            className={cn(
              "inline-flex items-center gap-0.5",
              isUp && "text-success",
              isDown && "text-danger",
              !isUp && !isDown && "text-muted-foreground",
            )}
          >
            <TrendIcon className="h-3.5 w-3.5" aria-hidden />
            {Math.abs(trend!)}%
          </span>
          <span className="text-muted-foreground">{hint}</span>
        </div>
      )}
    </Card>
  );
}

/** Skeleton matching StatCard geometry for loading states. */
export function StatCardSkeleton(): React.JSX.Element {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
      <Skeleton className="mt-3 h-7 w-28" />
      <Skeleton className="mt-3 h-3 w-32" />
    </Card>
  );
}
