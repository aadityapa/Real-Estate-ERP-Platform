"use client";

import { ModuleListPage } from "@/components/modules/module-list-page";
import { StatusBadge } from "@/components/tables/filter-bar";
import { formatCurrency } from "@/lib/format";

type PurchaseOrder = {
  id: string;
  poNumber: string;
  status: string;
  totalAmount: number;
};

export default function PurchaseOrdersPage(): React.ReactElement {
  return (
    <ModuleListPage<PurchaseOrder>
      title="Purchase Orders"
      apiPath="/procurement/purchase-orders"
      columns={[
        { key: "poNumber", header: "PO Number" },
        {
          key: "status",
          header: "Status",
          render: (row) => <StatusBadge status={row.status} />,
        },
        {
          key: "totalAmount",
          header: "Amount",
          render: (row) => formatCurrency(row.totalAmount),
        },
      ]}
    />
  );
}
