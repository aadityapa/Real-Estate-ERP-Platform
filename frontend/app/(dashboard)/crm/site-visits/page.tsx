"use client";

import { ModuleListPage } from "@/components/modules/module-list-page";
import { StatusBadge } from "@/components/tables/filter-bar";

type SiteVisit = {
  id: string;
  scheduledAt: string;
  status: string;
};

export default function SiteVisitsPage(): React.ReactElement {
  return (
    <ModuleListPage<SiteVisit>
      title="Site Visits"
      apiPath="/crm/site-visits"
      columns={[
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
