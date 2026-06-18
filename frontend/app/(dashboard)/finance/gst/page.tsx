"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPIGrid } from "@/components/charts/kpi-card";

const metrics = [
  { title: "GST Payable (MTD)", value: 245000, format: "currency" as const },
  { title: "Input Tax Credit", value: 182000, format: "currency" as const },
  { title: "Net GST Due", value: 63000, format: "currency" as const },
  { title: "Returns Filed", value: 2, format: "number" as const },
];

export default function GstPage(): React.ReactElement {
  return (
    <PageLayout title="GST Compliance">
      <div className="space-y-6">
        <KPIGrid metrics={metrics} />

        <Card>
          <CardHeader>
            <CardTitle>GST Returns</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              GST filing and reconciliation module coming soon. Track GSTR-1,
              GSTR-3B, and input tax credit summaries here.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
