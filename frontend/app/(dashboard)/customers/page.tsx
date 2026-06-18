"use client";

import { ModuleListPage } from "@/components/modules/module-list-page";
import { StatusBadge } from "@/components/tables/filter-bar";

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  portalAccess: boolean;
};

export default function CustomersPage(): React.ReactElement {
  return (
    <ModuleListPage<Customer>
      title="Customers"
      apiPath="/customers"
      columns={[
        { key: "firstName", header: "First Name" },
        { key: "lastName", header: "Last Name" },
        { key: "phone", header: "Phone" },
        {
          key: "portalAccess",
          header: "Portal Access",
          render: (row) => (
            <StatusBadge
              status={row.portalAccess ? "ACTIVE" : "PENDING"}
            />
          ),
        },
      ]}
    />
  );
}
