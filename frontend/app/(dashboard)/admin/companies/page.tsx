"use client";

import { ModuleListPage } from "@/components/modules/module-list-page";
import { StatusBadge } from "@/components/tables/filter-bar";

type Company = {
  id: string;
  name: string;
  gstin: string;
  status: string;
};

export default function CompaniesPage(): React.ReactElement {
  return (
    <ModuleListPage<Company>
      title="Companies"
      apiPath="/admin/companies"
      columns={[
        { key: "name", header: "Name" },
        { key: "gstin", header: "GSTIN" },
        {
          key: "status",
          header: "Status",
          render: (row) => <StatusBadge status={row.status} />,
        },
      ]}
    />
  );
}
