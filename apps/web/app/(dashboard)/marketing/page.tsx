"use client";

import { ModuleListPage } from "@/components/modules/module-list-page";
import { StatusBadge } from "@/components/tables/filter-bar";
import { formatCurrency } from "@propos/shared-utils";

type Campaign = {
  id: string;
  name: string;
  type: string;
  status: string;
  budget: number;
};

export default function MarketingPage(): React.ReactElement {
  return (
    <ModuleListPage<Campaign>
      title="Marketing Campaigns"
      apiPath="/marketing/campaigns"
      columns={[
        { key: "name", header: "Campaign" },
        { key: "type", header: "Type" },
        {
          key: "status",
          header: "Status",
          render: (row) => <StatusBadge status={row.status} />,
        },
        {
          key: "budget",
          header: "Budget",
          render: (row) => formatCurrency(row.budget),
        },
      ]}
    />
  );
}
