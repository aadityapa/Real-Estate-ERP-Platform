"use client";

import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { KPIGrid } from "@/components/charts/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const metrics = [
  { title: "Active Projects", value: 8, format: "number" as const },
  { title: "Milestones Due", value: 5, format: "number" as const },
  { title: "Avg Completion", value: 68, format: "percent" as const },
  { title: "DPRs This Week", value: 24, format: "number" as const },
];

export default function ConstructionDashboardPage(): React.ReactElement {
  return (
    <PageLayout
      title="Construction Dashboard"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/construction/projects">Projects</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/construction/milestones">Milestones</Link>
          </Button>
          <Button variant="accent" asChild>
            <Link href="/construction/dpr">DPR</Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <KPIGrid metrics={metrics} />

        <Card>
          <CardHeader>
            <CardTitle>Project Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: "Sunrise Towers", pct: 72 },
                { name: "Green Valley", pct: 45 },
                { name: "Skyline Residency", pct: 88 },
              ].map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">{item.name}</span>
                    <span className="font-medium">{item.pct}%</span>
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
