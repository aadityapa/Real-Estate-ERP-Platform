"use client";

import { ModuleListPage } from "@/components/modules/module-list-page";
import { StatusBadge } from "@/components/tables/filter-bar";

type Milestone = {
  id: string;
  name: string;
  status: string;
  completionPct: number;
};

export default function MilestonesPage(): React.ReactElement {
  return (
    <ModuleListPage<Milestone>
      title="Milestones"
      apiPath="/construction/milestones"
      columns={[
        { key: "name", header: "Milestone" },
        {
          key: "status",
          header: "Status",
          render: (row) => <StatusBadge status={row.status} />,
        },
        {
          key: "completionPct",
          header: "Completion",
          render: (row) => `${row.completionPct}%`,
        },
      ]}
    />
  );
}
