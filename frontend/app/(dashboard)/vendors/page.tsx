"use client";

import { ModuleListPage } from "@/components/modules/module-list-page";
import { StatusBadge } from "@/components/tables/filter-bar";

type Vendor = {
  id: string;
  name: string;
  type: string;
  phone: string;
  status: string;
};

export default function VendorsPage(): React.ReactElement {
  return (
    <ModuleListPage<Vendor>
      title="Vendors"
      apiPath="/vendors"
      columns={[
        { key: "name", header: "Name" },
        { key: "type", header: "Type" },
        { key: "phone", header: "Phone" },
        {
          key: "status",
          header: "Status",
          render: (row) => <StatusBadge status={row.status} />,
        },
      ]}
    />
  );
}
