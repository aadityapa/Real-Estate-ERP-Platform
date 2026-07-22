"use client";

import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { KPIGrid } from "@/components/charts/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const metrics = [
  { title: "Collections (MTD)", value: 7100000, format: "currency" as const },
  { title: "Expenses (MTD)", value: 4200000, format: "currency" as const },
  { title: "Outstanding", value: 1850000, format: "currency" as const },
  { title: "Open POs", value: 14, format: "number" as const },
];

export default function FinanceDashboardPage(): React.ReactElement {
  return (
    <PageLayout
      title="Finance Dashboard"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/finance/budget">Budget</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/finance/accounts">Accounts</Link>
          </Button>
          <Button variant="accent" asChild>
            <Link href="/vendors">Vendors</Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <KPIGrid metrics={metrics} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Budget vs Actual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { category: "Construction", planned: 85, actual: 72 },
                  { category: "Marketing", planned: 60, actual: 55 },
                  { category: "Operations", planned: 45, actual: 48 },
                ].map((item) => (
                  <div key={item.category} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">{item.category}</span>
                      <span className="font-medium">
                        {item.actual}% / {item.planned}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-accent"
                        style={{ width: `${item.actual}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "GST", href: "/finance/gst" },
                  { label: "Vendors", href: "/vendors" },
                  { label: "Purchase Orders", href: "/procurement/purchase-orders" },
                  { label: "Ledger", href: "/finance/accounts" },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-lg border border-border p-3 text-center text-sm font-medium transition-colors hover:bg-slate-50"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
