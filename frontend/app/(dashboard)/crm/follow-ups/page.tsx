"use client";

import { ModuleListPage } from "@/components/modules/module-list-page";
import { StatusBadge } from "@/components/tables/filter-bar";

type FollowUp = {
  id: string;
  type: string;
  scheduledAt: string;
  status: string;
  lead?: { firstName: string; lastName?: string };
};

export default function FollowUpsPage(): React.ReactElement {
  return (
    <ModuleListPage<FollowUp>
      title="Follow-ups"
      apiPath="/crm/follow-ups"
      columns={[
        {
          key: "lead",
          header: "Lead",
          render: (row) =>
            row.lead
              ? `${row.lead.firstName} ${row.lead.lastName ?? ""}`
              : "—",
        },
        { key: "type", header: "Type" },
        {
          key: "scheduledAt",
          header: "Scheduled",
          render: (row) =>
            new Date(row.scheduledAt).toLocaleString("en-IN"),
        },
        {
          key: "status",
          header: "Status",
          render: (row) => <StatusBadge status={row.status} />,
        },
      ]}
    />
  );
}
