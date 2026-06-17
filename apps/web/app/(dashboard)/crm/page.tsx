"use client";

import Link from "next/link";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Plus } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { KPIGrid } from "@/components/charts/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCrmDashboard } from "@/hooks/use-leads";

const COLORS = ["#f59e0b", "#64748b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];

export default function CrmDashboardPage(): React.ReactElement {
  const { data, isLoading } = useCrmDashboard();

  const metrics = [
    {
      title: "Total Leads",
      value: data?.totalLeads ?? 0,
      format: "number" as const,
    },
    {
      title: "Follow-ups Today",
      value: data?.followUpsToday ?? 0,
      format: "number" as const,
    },
    {
      title: "Site Visits Today",
      value: data?.siteVisitsToday ?? 0,
      format: "number" as const,
    },
    {
      title: "Conversion Rate",
      value: data?.conversionRate ?? 0,
      format: "percent" as const,
    },
  ];

  const sourceData =
    data?.leadsBySource.map((s) => ({
      name: s.source,
      value: s.count,
    })) ?? [];

  return (
    <PageLayout
      title="CRM Dashboard"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/crm/pipeline">Pipeline</Link>
          </Button>
          <Button variant="accent" asChild>
            <Link href="/crm/leads/new">
              <Plus className="mr-1 h-4 w-4" />
              New Lead
            </Link>
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="p-8 text-center text-slate-500">Loading...</div>
      ) : (
        <div className="space-y-6">
          <KPIGrid metrics={metrics} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Leads by Source</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={sourceData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label
                    >
                      {sourceData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Leads by Stage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(data?.leadsByStatus ?? []).map((item) => (
                    <div key={item.status} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">
                          {item.status.replace(/_/g, " ")}
                        </span>
                        <span className="font-medium">{item.count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-accent"
                          style={{
                            width: `${data?.totalLeads ? (item.count / data.totalLeads) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
