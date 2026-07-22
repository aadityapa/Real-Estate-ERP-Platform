"use client";

import { ModuleListPage } from "@/components/modules/module-list-page";
import { StatusBadge } from "@/components/tables/filter-bar";

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
};

export default function UsersPage(): React.ReactElement {
  return (
    <ModuleListPage<User>
      title="Users"
      apiPath="/admin/users"
      columns={[
        { key: "firstName", header: "First Name" },
        { key: "lastName", header: "Last Name" },
        { key: "email", header: "Email" },
        {
          key: "status",
          header: "Status",
          render: (row) => <StatusBadge status={row.status} />,
        },
      ]}
    />
  );
}
