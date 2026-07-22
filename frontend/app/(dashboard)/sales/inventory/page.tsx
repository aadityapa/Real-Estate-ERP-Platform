"use client";

import { ModuleListPage } from "@/components/modules/module-list-page";
import { StatusBadge } from "@/components/tables/filter-bar";
import { formatCurrency } from "@/lib/format";

type Inventory = {
  id: string;
  unitNumber: string;
  type: string;
  status: string;
  basePrice: number;
  area: number;
};

export default function InventoryPage(): React.ReactElement {
  return (
    <ModuleListPage<Inventory>
      title="Inventory"
      apiPath="/sales/inventory"
      columns={[
        { key: "unitNumber", header: "Unit" },
        { key: "type", header: "Type" },
        {
          key: "status",
          header: "Status",
          render: (row) => <StatusBadge status={row.status} />,
        },
        {
          key: "basePrice",
          header: "Base Price",
          render: (row) => formatCurrency(row.basePrice),
        },
        {
          key: "area",
          header: "Area (sqft)",
          render: (row) => row.area.toLocaleString("en-IN"),
        },
      ]}
    />
  );
}
