import {
  Building2,
  CalendarCheck,
  Download,
  IndianRupee,
  Users,
} from "lucide-react";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { LiveActivityFeed } from "@/components/dashboard/live-activity-feed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";

const stats = [
  {
    label: "Collections (MTD)",
    value: formatCurrency(7_100_000),
    trend: 12.5,
    icon: <IndianRupee className="h-5 w-5" />,
    intent: "primary" as const,
  },
  {
    label: "Active Leads",
    value: (248).toLocaleString("en-IN"),
    trend: 8.2,
    icon: <Users className="h-5 w-5" />,
    intent: "neutral" as const,
  },
  {
    label: "New Bookings",
    value: (18).toLocaleString("en-IN"),
    trend: -3.1,
    icon: <CalendarCheck className="h-5 w-5" />,
    intent: "success" as const,
  },
  {
    label: "Inventory Available",
    value: (342).toLocaleString("en-IN"),
    trend: 2.4,
    icon: <Building2 className="h-5 w-5" />,
    intent: "neutral" as const,
  },
];

const funnel = [
  { stage: "New Leads", count: 86, pct: 100 },
  { stage: "Contacted", count: 64, pct: 74 },
  { stage: "Site Visit", count: 38, pct: 44 },
  { stage: "Negotiation", count: 22, pct: 26 },
  { stage: "Booking", count: 18, pct: 21 },
];

const recentActivity = [
  { action: "New lead from Facebook Ads", time: "2 min ago" },
  { action: "Booking confirmed — Tower A, Unit 1204", time: "15 min ago" },
  { action: "Payment received — ₹5,00,000", time: "1 hour ago" },
  { action: "DPR submitted — Project Sunrise", time: "2 hours ago" },
];

export default function ExecutiveDashboardPage(): React.ReactElement {
  return (
    <DashboardShell title="Executive Dashboard">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Good day — here&apos;s your portfolio at a glance
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Month-to-date performance across sales, collections, and inventory.
            </p>
          </div>
          <Button variant="outline" size="sm" className="self-start sm:self-auto">
            <Download className="h-4 w-4" aria-hidden />
            Export report
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="animate-rise"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <StatCard {...s} />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Revenue Trend</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Last 6 months · collections in ₹
                </p>
              </div>
              <Badge variant="success" dot>
                +18% QoQ
              </Badge>
            </CardHeader>
            <CardContent>
              <RevenueChart />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sales Funnel</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Lead-to-booking conversion
              </p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {funnel.map((item) => (
                  <li key={item.stage} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{item.stage}</span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {item.count}
                      </span>
                    </div>
                    <div
                      className="h-2 overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-valuenow={item.pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${item.stage}: ${item.pct}% of leads`}
                    >
                      <div
                        className="h-full rounded-full bg-accent transition-all duration-500"
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {recentActivity.map((activity) => (
                  <li
                    key={activity.action}
                    className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0 last:pb-0"
                  >
                    <span className="text-sm text-foreground">
                      {activity.action}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {activity.time}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <LiveActivityFeed />
        </div>
      </div>
    </DashboardShell>
  );
}
