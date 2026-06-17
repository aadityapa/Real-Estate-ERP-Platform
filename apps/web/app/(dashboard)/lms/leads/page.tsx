"use client";

import { useState } from "react";
import Link from "next/link";
import { Phone } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { DataTable } from "@/components/tables/data-table";
import { FilterBar } from "@/components/tables/filter-bar";
import { Button } from "@/components/ui/button";
import { LeadLabelBadge, CallStatusBadge } from "@/components/lms/lead-badges";
import { useLmsLeads } from "@/hooks/use-lms";

type LmsLeadRow = {
  id: string;
  clientName: string;
  leadId: string;
  projectName: string;
  leadLabel: "HOT" | "WARM" | "COLD" | "LOST";
  followUp: string | null;
  callStatus: "ANSWERED" | "MISSED" | "PENDING";
  phone: string;
  description?: string | null;
  leadRat?: number;
};

export default function LmsLeadsPage(): React.ReactElement {
  const [search, setSearch] = useState("");
  const [leadLabel, setLeadLabel] = useState("");
  const { data, isLoading } = useLmsLeads({
    ...(search && { search }),
    ...(leadLabel && { leadLabel }),
  });

  const leads = ((data?.data ?? []) as LmsLeadRow[]) ?? [];

  return (
    <PageLayout title="All Leads" back="/lms">
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        onClear={() => {
          setSearch("");
          setLeadLabel("");
        }}
        filters={[
          {
            key: "label",
            label: "All Labels",
            value: leadLabel,
            onChange: setLeadLabel,
            options: ["HOT", "WARM", "COLD", "LOST"].map((l) => ({
              label: l,
              value: l,
            })),
          },
        ]}
      />

      {isLoading ? (
        <div className="p-8 text-center text-slate-500">Loading...</div>
      ) : (
        <DataTable
          columns={[
            { key: "clientName", header: "Client Name" },
            { key: "leadId", header: "Lead ID" },
            { key: "projectName", header: "Project Name" },
            { key: "leadRat", header: "LeadRat" },
            {
              key: "leadLabel",
              header: "Lead Label",
              render: (row) => (
                <LeadLabelBadge label={row.leadLabel} />
              ),
            },
            {
              key: "followUp",
              header: "Follow Up",
              render: (row) =>
                row.followUp
                  ? new Date(row.followUp).toLocaleString()
                  : "—",
            },
            {
              key: "callStatus",
              header: "Call Status",
              render: (row) => (
                <CallStatusBadge status={row.callStatus} />
              ),
            },
            {
              key: "phone",
              header: "Phone No.",
              render: (row) => (
                <a
                  href={`tel:${row.phone}`}
                  className="flex items-center gap-1 text-primary"
                >
                  <Phone className="h-3 w-3" />
                  {row.phone}
                </a>
              ),
            },
            { key: "description", header: "Description" },
            {
              key: "actions",
              header: "",
              render: (row) => (
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/lms/leads/tracking?id=${row.id}`}>Track</Link>
                </Button>
              ),
            },
          ]}
          data={leads}
        />
      )}
    </PageLayout>
  );
}
