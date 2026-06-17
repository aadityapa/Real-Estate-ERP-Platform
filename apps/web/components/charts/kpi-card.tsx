import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@propos/shared-utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: number;
  trend?: number;
  format?: "currency" | "number" | "percent";
}

function formatValue(value: number, format: KPICardProps["format"]): string {
  switch (format) {
    case "currency":
      return formatCurrency(value);
    case "percent":
      return `${value}%`;
    default:
      return value.toLocaleString("en-IN");
  }
}

export function KPICard({
  title,
  value,
  trend,
  format = "number",
}: KPICardProps): React.ReactElement {
  const isPositive = trend !== undefined && trend >= 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-500">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value, format)}</div>
        {trend !== undefined && (
          <div
            className={cn(
              "mt-1 flex items-center gap-1 text-xs font-medium",
              isPositive ? "text-success" : "text-danger",
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(trend)}% vs last month
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface KPIGridProps {
  metrics: KPICardProps[];
}

export function KPIGrid({ metrics }: KPIGridProps): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <KPICard key={metric.title} {...metric} />
      ))}
    </div>
  );
}
