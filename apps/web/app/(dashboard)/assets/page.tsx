"use client";

import { ModuleListPage } from "@/components/modules/module-list-page";
import { StatusBadge } from "@/components/tables/filter-bar";

type Asset = {
  id: string;
  name: string;
  type: string;
  status: string;
};

export default function AssetsPage(): React.ReactElement {
  return (
    <ModuleListPage<Asset>
      title="Assets"
      apiPath="/assets"
      columns={[
        { key: "name", header: "Name" },
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
