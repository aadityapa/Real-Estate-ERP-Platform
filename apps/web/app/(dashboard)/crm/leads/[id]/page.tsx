"use client";

import { use } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/tables/filter-bar";
import { useLead } from "@/hooks/use-leads";

export default function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): React.ReactElement {
  const { id } = use(params);
  const { data: lead, isLoading } = useLead(id);

  if (isLoading) {
    return (
      <PageLayout title="Lead Details" back="/crm/leads">
        <div className="p-8 text-center text-slate-500">Loading...</div>
      </PageLayout>
    );
  }

  if (!lead) {
    return (
      <PageLayout title="Lead Details" back="/crm/leads">
        <div className="p-8 text-center text-slate-500">Lead not found</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={`${lead.firstName} ${lead.lastName ?? ""}`} back="/crm/leads">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <Info label="Phone" value={lead.phone} />
            <Info label="Email" value={lead.email ?? "—"} />
            <Info label="Source" value={lead.source} />
            <Info label="Location" value={lead.location ?? "—"} />
            <Info label="Priority" value={<StatusBadge status={lead.priority} />} />
            <Info label="Status" value={<StatusBadge status={lead.status} />} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assignment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Info
              label="Assigned To"
              value={
                lead.assignedTo
                  ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`
                  : "Unassigned"
              }
            />
            <Info
              label="Project"
              value={lead.project?.name ?? "—"}
            />
            <Info label="Score" value={String(lead.score)} />
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): React.ReactElement {
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p className="font-medium text-slate-900">{value}</p>
    </div>
  );
}
