"use client";

import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { PageLayout } from "@/components/layout/page-layout";
import { KPIGrid } from "@/components/charts/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useLmsCounters,
  useLmsLeaderboard,
  useLmsFunnel,
  useLmsSources,
  useClashLeads,
} from "@/hooks/use-lms";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];

export default function LmsDashboardPage(): React.ReactElement {
  const { data: counters, isLoading } = useLmsCounters();
  const { data: leaderboard } = useLmsLeaderboard();
  const { data: funnel } = useLmsFunnel();
  const { data: sources } = useLmsSources();
  const { data: clashes } = useClashLeads();

  const metrics = [
    { title: "Total Enquiries", value: counters?.totalEnquiries ?? 0, format: "number" as const },
    { title: "Site Visits", value: counters?.siteVisits ?? 0, format: "number" as const },
    { title: "Bookings Done", value: counters?.bookingsDone ?? 0, format: "number" as const },
    { title: "Conversion Ratio", value: counters?.conversionRatio ?? 0, format: "percent" as const },
    { title: "Inventory Available", value: counters?.inventoryAvailable ?? 0, format: "number" as const },
    { title: "Total Projects", value: counters?.totalProjects ?? 0, format: "number" as const },
  ];

  const navLinks = [
    { href: "/lms/goals", label: "Goals & Targets" },
    { href: "/lms/reports/da-report", label: "DA Report" },
    { href: "/lms/leads", label: "Lead Management" },
  ];

  return (
    <PageLayout
      title="LMS Dashboard"
      actions={
        <div className="flex gap-2">
          {navLinks.map((l) => (
            <Button key={l.href} variant="outline" size="sm" asChild>
              <Link href={l.href}>{l.label}</Link>
            </Button>
          ))}
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
                <CardTitle>Sales Funnel</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnel ?? []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lead Source Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sources ?? []}
                      dataKey="count"
                      nameKey="source"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label
                    >
                      {(sources ?? []).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Leader Board</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="pb-2">Rank</th>
                      <th className="pb-2">Name</th>
                      <th className="pb-2">Leads</th>
                      <th className="pb-2">Conv%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(leaderboard ?? []).slice(0, 10).map((entry) => (
                      <tr key={entry.userId} className="border-b">
                        <td className="py-2">
                          {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : entry.rank}
                        </td>
                        <td className="py-2 font-medium">{entry.name}</td>
                        <td className="py-2">{entry.totalLeads}</td>
                        <td className="py-2">{entry.conversionRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Clash Board</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {((clashes as Array<Record<string, unknown>>) ?? []).length === 0 ? (
                  <p className="text-sm text-slate-500">No pending clash leads</p>
                ) : (
                  ((clashes as Array<{
                    id: string;
                    leadA: { firstName: string; phone: string };
                    leadB: { firstName: string; phone: string };
                  }>) ?? []).map((c) => (
                    <div key={c.id} className="rounded-lg border p-3 text-sm">
                      <p>
                        <strong>{c.leadA.firstName}</strong> ({c.leadA.phone}) clashes with{" "}
                        <strong>{c.leadB.firstName}</strong> ({c.leadB.phone})
                      </p>
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant="outline">Resolve</Button>
                        <Button size="sm" variant="ghost">Dismiss</Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
