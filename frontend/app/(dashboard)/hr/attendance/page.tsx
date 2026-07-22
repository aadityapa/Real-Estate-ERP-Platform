"use client";

import { ModuleListPage } from "@/components/modules/module-list-page";
import { StatusBadge } from "@/components/tables/filter-bar";

type Attendance = {
  id: string;
  date: string;
  status: string;
  employee?: { firstName: string; lastName: string };
};

export default function AttendancePage(): React.ReactElement {
  return (
    <ModuleListPage<Attendance>
      title="Attendance"
      apiPath="/hr/attendance"
      columns={[
        {
          key: "employee",
          header: "Employee",
          render: (row) =>
            row.employee
              ? `${row.employee.firstName} ${row.employee.lastName}`
              : "—",
        },
        {
          key: "date",
          header: "Date",
          render: (row) => new Date(row.date).toLocaleDateString("en-IN"),
        },
        {
          key: "status",
          header: "Status",
          render: (row) => <StatusBadge status={row.status} />,
        },
      ]}
    />
  );
}
