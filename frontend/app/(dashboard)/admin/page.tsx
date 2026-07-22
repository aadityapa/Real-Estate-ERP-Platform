"use client";

import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { KPIGrid } from "@/components/charts/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const metrics = [
  { title: "Companies", value: 4, format: "number" as const },
  { title: "Projects", value: 12, format: "number" as const },
  { title: "Active Users", value: 86, format: "number" as const },
  { title: "Pending Approvals", value: 3, format: "number" as const },
];

export default function AdminDashboardPage(): React.ReactElement {
  return (
    <PageLayout
      title="Admin Dashboard"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/companies">Companies</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/projects">Projects</Link>
          </Button>
          <Button variant="accent" asChild>
            <Link href="/admin/users">Users</Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <KPIGrid metrics={metrics} />

        <Card>
          <CardHeader>
            <CardTitle>System Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { label: "Companies", href: "/admin/companies", count: 4 },
                { label: "Projects", href: "/admin/projects", count: 12 },
                { label: "Users", href: "/admin/users", count: 86 },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg border border-border p-4 transition-colors hover:bg-slate-50"
                >
                  <p className="text-2xl font-bold">{item.count}</p>
                  <p className="text-sm text-slate-600">{item.label}</p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
