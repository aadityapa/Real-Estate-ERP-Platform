"use client";

import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { KPIGrid } from "@/components/charts/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const metrics = [
  { title: "Available Units", value: 342, format: "number" as const },
  { title: "Bookings (MTD)", value: 18, format: "number" as const },
  { title: "Revenue (MTD)", value: 12500000, format: "currency" as const },
  { title: "Conversion Rate", value: 12, format: "percent" as const },
];

export default function SalesDashboardPage(): React.ReactElement {
  return (
    <PageLayout
      title="Sales Dashboard"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/sales/inventory">Inventory</Link>
          </Button>
          <Button variant="accent" asChild>
            <Link href="/sales/bookings">Bookings</Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <KPIGrid metrics={metrics} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Inventory by Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { type: "2 BHK", count: 128, pct: 37 },
                  { type: "3 BHK", count: 156, pct: 46 },
                  { type: "4 BHK", count: 42, pct: 12 },
                  { type: "Penthouse", count: 16, pct: 5 },
                ].map((item) => (
                  <div key={item.type} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">{item.type}</span>
                      <span className="font-medium">{item.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-accent"
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-slate-600">
                <p>Booking #BK-2024-018 — Tower A, Unit 1204</p>
                <p>Booking #BK-2024-017 — Tower B, Unit 805</p>
                <p>Booking #BK-2024-016 — Tower C, Unit 302</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
