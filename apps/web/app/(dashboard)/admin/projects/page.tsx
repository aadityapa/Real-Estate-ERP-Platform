"use client";

import { ModuleListPage } from "@/components/modules/module-list-page";
import { StatusBadge } from "@/components/tables/filter-bar";

type Project = {
  id: string;
  name: string;
  code: string;
  type: string;
  status: string;
};

export default function AdminProjectsPage(): React.ReactElement {
  return (
    <ModuleListPage<Project>
      title="Projects"
      apiPath="/admin/projects"
      columns={[
        { key: "name", header: "Name" },
        { key: "code", header: "Code" },
        { key: "type", header: "Type" },
        {
          key: "status",
          header: "Status",
          render: (row) => <StatusBadge status={row.status} />,
        },
      ]}
    />
  );
}
