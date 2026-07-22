"use client";

import { ModuleListPage } from "@/components/modules/module-list-page";
import { StatusBadge } from "@/components/tables/filter-bar";

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  designation: string;
  status: string;
};

export default function EmployeesPage(): React.ReactElement {
  return (
    <ModuleListPage<Employee>
      title="Employees"
      apiPath="/hr/employees"
      columns={[
        { key: "firstName", header: "First Name" },
        { key: "lastName", header: "Last Name" },
        { key: "email", header: "Email" },
        { key: "designation", header: "Designation" },
        {
          key: "status",
          header: "Status",
          render: (row) => <StatusBadge status={row.status} />,
        },
      ]}
    />
  );
}
