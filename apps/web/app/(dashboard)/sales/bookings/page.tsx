"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { ModuleListPage } from "@/components/modules/module-list-page";
import { StatusBadge } from "@/components/tables/filter-bar";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@propos/shared-utils";

type Booking = {
  id: string;
  bookingNumber: string;
  status: string;
  bookingDate: string;
  totalAmount: number;
};

export default function BookingsPage(): React.ReactElement {
  return (
    <ModuleListPage<Booking>
      title="Bookings"
      apiPath="/sales/bookings"
      actions={
        <Button variant="accent" asChild>
          <Link href="/sales/bookings/new">
            <Plus className="mr-1 h-4 w-4" />
            New Booking
          </Link>
        </Button>
      }
      columns={[
        { key: "bookingNumber", header: "Booking #" },
        {
          key: "status",
          header: "Status",
          render: (row) => <StatusBadge status={row.status} />,
        },
        {
          key: "bookingDate",
          header: "Date",
          render: (row) =>
            new Date(row.bookingDate).toLocaleDateString("en-IN"),
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
