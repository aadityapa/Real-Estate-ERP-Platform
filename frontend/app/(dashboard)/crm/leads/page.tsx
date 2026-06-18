"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/tables/data-table";
import { FilterBar, StatusBadge } from "@/components/tables/filter-bar";
import { useLeads } from "@/hooks/use-leads";

export default function LeadsPage(): React.ReactElement {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useLeads({
    status: status || undefined,
    source: source || undefined,
    search: search || undefined,
  });

  const leads = data?.data ?? [];

  return (
    <PageLayout
      title="Leads"
      actions={
        <Button variant="accent" asChild>
          <Link href="/crm/leads/new">
            <Plus className="mr-1 h-4 w-4" />
            New Lead
          </Link>
        </Button>
      }
    >
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        onClear={() => {
          setStatus("");
          setSource("");
          setSearch("");
        }}
        filters={[
          {
            key: "status",
            label: "All Statuses",
            value: status,
            onChange: setStatus,
            options: [
              "NEW",
              "CONTACTED",
              "INTERESTED",
              "SITE_VISIT",
              "NEGOTIATION",
              "BOOKING",
              "LOST",
            ].map((s) => ({ label: s.replace(/_/g, " "), value: s })),
          },
          {
            key: "source",
            label: "All Sources",
            value: source,
            onChange: setSource,
            options: [
              "WEBSITE",
              "FACEBOOK",
              "GOOGLE",
              "WHATSAPP",
              "WALKIN",
              "REFERRAL",
            ].map((s) => ({ label: s, value: s })),
          },
        ]}
      />

      <DataTable
        loading={isLoading}
        data={leads}
        onRowClick={(row) => router.push(`/crm/leads/${row.id}`)}
        columns={[
          {
            key: "name",
            header: "Name",
            render: (row) => `${row.firstName} ${row.lastName ?? ""}`,
          },
          { key: "phone", header: "Phone" },
          { key: "source", header: "Source" },
          {
            key: "status",
            header: "Status",
            render: (row) => <StatusBadge status={row.status} />,
          },
          {
            key: "assignedTo",
            header: "Assigned To",
            render: (row) =>
              row.assignedTo
                ? `${row.assignedTo.firstName} ${row.assignedTo.lastName}`
                : "—",
          },
          {
            key: "createdAt",
            header: "Created",
            render: (row) => new Date(row.createdAt).toLocaleDateString("en-IN"),
          },
        ]}
      />
    </PageLayout>
  );
}
