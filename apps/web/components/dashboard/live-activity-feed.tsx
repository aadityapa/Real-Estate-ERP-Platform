"use client";

import { useDashboardSocket } from "@/hooks/use-dashboard-socket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TYPE_COLORS: Record<string, string> = {
  "lead.created": "bg-blue-500",
  "booking.created": "bg-emerald-500",
  "payment.received": "bg-amber-500",
  "lead.scored": "bg-purple-500",
};

export function LiveActivityFeed(): React.ReactElement {
  const { events, connected } = useDashboardSocket();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Live Activity</CardTitle>
        <span
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium",
            connected ? "text-emerald-600" : "text-slate-400",
          )}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              connected ? "bg-emerald-500 animate-pulse" : "bg-slate-300",
            )}
          />
          {connected ? "Live" : "Offline"}
        </span>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">
            Waiting for real-time events...
          </p>
        ) : (
          <div className="space-y-3 max-h-[320px] overflow-y-auto">
            {events.map((event, i) => (
              <div
                key={`${event.timestamp}-${i}`}
                className="flex items-start gap-3 border-b border-border pb-3 last:border-0"
              >
                <span
                  className={cn(
                    "mt-1 h-2 w-2 shrink-0 rounded-full",
                    TYPE_COLORS[event.type] ?? "bg-slate-400",
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700">{event.message}</p>
                  <p className="text-xs text-slate-400">
                    {event.module} ·{" "}
                    {new Date(event.timestamp).toLocaleTimeString("en-IN")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
