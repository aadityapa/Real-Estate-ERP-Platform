"use client";

import { ModuleListPage } from "@/components/modules/module-list-page";
import { StatusBadge } from "@/components/tables/filter-bar";
import { formatCurrency } from "@/lib/format";

type LedgerEntry = {
  id: string;
  accountName: string;
  entryType: string;
  amount: number;
  entryDate: string;
};

export default function AccountsPage(): React.ReactElement {
  return (
    <ModuleListPage<LedgerEntry>
      title="Accounts Ledger"
      apiPath="/finance/ledger"
      columns={[
        { key: "accountName", header: "Account" },
        {
          key: "entryType",
          header: "Type",
          render: (row) => <StatusBadge status={row.entryType} />,
        },
        {
          key: "amount",
          header: "Amount",
          render: (row) => formatCurrency(row.amount),
        },
        {
          key: "entryDate",
          header: "Date",
          render: (row) =>
            new Date(row.entryDate).toLocaleDateString("en-IN"),
        },
      ]}
    />
  );
}
