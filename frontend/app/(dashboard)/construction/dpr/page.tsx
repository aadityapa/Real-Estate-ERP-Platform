"use client";

import { ModuleListPage } from "@/components/modules/module-list-page";
import { StatusBadge } from "@/components/tables/filter-bar";

type Dpr = {
  id: string;
  reportDate: string;
  status: string;
};

export default function DprPage(): React.ReactElement {
  return (
    <ModuleListPage<Dpr>
      title="Daily Progress Reports"
      apiPath="/construction/dpr"
      columns={[
        {
          key: "reportDate",
          header: "Report Date",
          render: (row) =>
            new Date(row.reportDate).toLocaleDateString("en-IN"),
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
