"use client";

import { ModuleListPage } from "@/components/modules/module-list-page";
import { StatusBadge } from "@/components/tables/filter-bar";

type LegalRecord = {
  id: string;
  title: string;
  type: string;
  status: string;
};

export default function LegalPage(): React.ReactElement {
  return (
    <ModuleListPage<LegalRecord>
      title="Legal"
      apiPath="/legal"
      columns={[
        { key: "title", header: "Title" },
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
