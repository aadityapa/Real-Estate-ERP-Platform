"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/tables/data-table";
import { api } from "@/lib/api";

type SiteVisitRow = {
  id: string;
  scheduledAt: string;
  status: string;
  ypsrReport?: unknown | null;
  lead: { firstName: string; lastName?: string | null; phone?: string | null };
  project: { name: string };
};

export default function LmsSiteVisitsPage(): React.ReactElement {
  const [status, setStatus] = useState("SCHEDULED");
  const { data, isLoading } = useQuery({
    queryKey: ["lms", "site-visits", status],
    queryFn: () => api.get(`/lms/site-visits?status=${status}`),
  });
  const items = ((data ?? []) as SiteVisitRow[]) ?? [];

  const tabs = ["SCHEDULED", "COMPLETED", "CANCELLED"];

  return (
    <PageLayout title="Site Visit Management" back="/lms">
      <div className="mb-4 flex gap-2">
        {tabs.map((t) => (
          <Button
            key={t}
            variant={status === t ? "default" : "outline"}
            size="sm"
            onClick={() => setStatus(t)}
          >
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-slate-500">Loading...</div>
      ) : (
        <DataTable
          columns={[
            {
              key: "lead",
              header: "Lead",
              render: (row) => `${row.lead.firstName} ${row.lead.lastName ?? ""}`,
            },
            {
              key: "project",
              header: "Project",
              render: (row) => row.project.name,
            },
            {
              key: "scheduledAt",
              header: "Visit Date",
              render: (row) => new Date(row.scheduledAt).toLocaleString(),
            },
            { key: "status", header: "Status" },
            {
              key: "ypsr",
              header: "YPSR",
              render: (row) =>
                row.ypsrReport ? (
                  "Submitted"
                ) : status === "COMPLETED" ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/lms/site-visits/${row.id}/ypsr`}>Fill YPSR</Link>
                  </Button>
                ) : (
                  "—"
                ),
            },
          ]}
          data={items}
        />
      )}
    </PageLayout>
  );
}
