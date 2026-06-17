"use client";

import { ModuleListPage } from "@/components/modules/module-list-page";
import { formatCurrency } from "@propos/shared-utils";

type Budget = {
  id: string;
  category: string;
  planned: number;
  actual: number;
  variance: number;
};

export default function BudgetPage(): React.ReactElement {
  return (
    <ModuleListPage<Budget>
      title="Budget"
      apiPath="/finance/budget"
      columns={[
        { key: "category", header: "Category" },
        {
          key: "planned",
          header: "Planned",
          render: (row) => formatCurrency(row.planned),
        },
        {
          key: "actual",
          header: "Actual",
          render: (row) => formatCurrency(row.actual),
        },
        {
          key: "variance",
          header: "Variance",
          render: (row) => (
            <span
              className={
                row.variance < 0 ? "text-danger" : "text-success"
              }
            >
              {formatCurrency(row.variance)}
            </span>
          ),
        },
      ]}
    />
  );
}
