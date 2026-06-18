import { DashboardShell } from "@/components/layout/dashboard-shell";
import { KPIGrid } from "@/components/charts/kpi-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { LiveActivityFeed } from "@/components/dashboard/live-activity-feed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const kpiMetrics = [
  { title: "Collections (MTD)", value: 7100000, trend: 12.5, format: "currency" as const },
  { title: "Active Leads", value: 248, trend: 8.2, format: "number" as const },
  { title: "New Bookings", value: 18, trend: -3.1, format: "number" as const },
  { title: "Inventory Available", value: 342, trend: 2.4, format: "number" as const },
];

export default function ExecutiveDashboardPage(): React.ReactElement {
  return (
    <DashboardShell title="Executive Dashboard">
      <div className="space-y-6">
        <KPIGrid metrics={kpiMetrics} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueChart />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sales Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { stage: "New Leads", count: 86, pct: 100 },
                  { stage: "Contacted", count: 64, pct: 74 },
                  { stage: "Site Visit", count: 38, pct: 44 },
                  { stage: "Negotiation", count: 22, pct: 26 },
                  { stage: "Booking", count: 18, pct: 21 },
                ].map((item) => (
                  <div key={item.stage} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">{item.stage}</span>
                      <span className="font-medium">{item.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-accent transition-all"
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { action: "New lead from Facebook Ads", time: "2 min ago" },
                { action: "Booking confirmed — Tower A, Unit 1204", time: "15 min ago" },
                { action: "Payment received — ₹5,00,000", time: "1 hour ago" },
                { action: "DPR submitted — Project Sunrise", time: "2 hours ago" },
              ].map((activity) => (
                <div
                  key={activity.action}
                  className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <span className="text-sm text-slate-700">{activity.action}</span>
                  <span className="text-xs text-slate-400">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <LiveActivityFeed />
      </div>
    </DashboardShell>
  );
}
