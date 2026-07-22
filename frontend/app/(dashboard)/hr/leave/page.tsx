"use client";

import { ModuleListPage } from "@/components/modules/module-list-page";
import { StatusBadge } from "@/components/tables/filter-bar";

type Leave = {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  status: string;
};

export default function LeavePage(): React.ReactElement {
  return (
    <ModuleListPage<Leave>
      title="Leave Requests"
      apiPath="/hr/leaves"
      columns={[
        { key: "type", header: "Type" },
        {
          key: "startDate",
          header: "Start",
          render: (row) =>
            new Date(row.startDate).toLocaleDateString("en-IN"),
        },
        {
          key: "endDate",
          header: "End",
          render: (row) => new Date(row.endDate).toLocaleDateString("en-IN"),
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
