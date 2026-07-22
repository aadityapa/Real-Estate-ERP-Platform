"use client";

import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { KPIGrid } from "@/components/charts/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const metrics = [
  { title: "Total Employees", value: 124, format: "number" as const },
  { title: "Present Today", value: 118, format: "number" as const },
  { title: "On Leave", value: 6, format: "number" as const },
  { title: "Pending Leave Requests", value: 4, format: "number" as const },
];

export default function HrDashboardPage(): React.ReactElement {
  return (
    <PageLayout
      title="HR Dashboard"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/hr/employees">Employees</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/hr/attendance">Attendance</Link>
          </Button>
          <Button variant="accent" asChild>
            <Link href="/hr/leave">Leave</Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <KPIGrid metrics={metrics} />

        <Card>
          <CardHeader>
            <CardTitle>Attendance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { status: "Present", count: 118, pct: 95 },
                { status: "On Leave", count: 6, pct: 5 },
                { status: "Absent", count: 0, pct: 0 },
              ].map((item) => (
                <div key={item.status} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{item.status}</span>
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
      </div>
    </PageLayout>
  );
}
