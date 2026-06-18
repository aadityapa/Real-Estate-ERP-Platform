"use client";

import { use, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/tables/filter-bar";
import { DataTable } from "@/components/tables/data-table";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/format";
import { API_ORIGIN } from "@/lib/env";
import { Download, FileText } from "lucide-react";

interface BookingDetail {
  id: string;
  bookingNumber: string;
  status: string;
  totalAmount: number;
  bookingAmount: number;
  bookingDate: string;
  customer: { firstName: string; lastName: string; phone: string };
  unit: { unitNumber: string; type: string; project: { name: string } };
  agreement?: { id: string; agreementNumber: string; documentUrl?: string; status: string };
  payments: {
    id: string;
    installmentName: string;
    dueDate: string;
    amount: number;
    paidAmount: number;
    status: string;
    receipt?: { id: string; receiptNumber: string; pdfUrl?: string };
  }[];
}

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): React.ReactElement {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState(0);

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => api.get<BookingDetail>(`/sales/bookings/${id}`),
  });

  async function recordPayment(paymentId: string): Promise<void> {
    setRecordingId(paymentId);
    try {
      await api.post(`/sales/payments/${paymentId}/record`, {
        amount: payAmount,
        paymentMode: "UPI",
      });
      void queryClient.invalidateQueries({ queryKey: ["booking", id] });
    } finally {
      setRecordingId(null);
    }
  }

  if (isLoading || !booking) {
    return (
      <PageLayout title="Booking" back="/sales/bookings">
        <div className="p-8 text-center text-slate-500">Loading...</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={booking.bookingNumber}
      back="/sales/bookings"
      actions={
        <div className="flex gap-2">
          {booking.agreement?.documentUrl && (
            <Button variant="outline" asChild>
              <a
                href={`${API_ORIGIN}${booking.agreement.documentUrl}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="mr-1 h-4 w-4" />
                Agreement PDF
              </a>
            </Button>
          )}
          {!booking.agreement && (
            <Button
              variant="accent"
              onClick={async () => {
                await api.post(`/sales/bookings/${id}/agreement`, {
                  type: "ALLOTMENT",
                });
                void queryClient.invalidateQueries({ queryKey: ["booking", id] });
              }}
            >
              <FileText className="mr-1 h-4 w-4" />
              Generate Agreement
            </Button>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Booking Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <Info label="Customer" value={`${booking.customer.firstName} ${booking.customer.lastName}`} />
            <Info label="Phone" value={booking.customer.phone} />
            <Info label="Unit" value={`${booking.unit.unitNumber} (${booking.unit.type})`} />
            <Info label="Project" value={booking.unit.project.name} />
            <Info label="Total" value={formatCurrency(Number(booking.totalAmount))} />
            <Info label="Booking Amount" value={formatCurrency(Number(booking.bookingAmount))} />
            <Info label="Status" value={<StatusBadge status={booking.status} />} />
            <Info
              label="Date"
              value={new Date(booking.bookingDate).toLocaleDateString("en-IN")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agreement</CardTitle>
          </CardHeader>
          <CardContent>
            {booking.agreement ? (
              <div className="space-y-2 text-sm">
                <p className="font-medium">{booking.agreement.agreementNumber}</p>
                <StatusBadge status={booking.agreement.status} />
              </div>
            ) : (
              <p className="text-sm text-slate-500">No agreement generated yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Payment Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {booking.payments.length === 0 ? (
            <p className="text-sm text-slate-500">No payment plan assigned</p>
          ) : (
            <DataTable
              data={booking.payments.map((p) => ({ ...p, id: p.id }))}
              columns={[
                { key: "installmentName", header: "Installment" },
                {
                  key: "dueDate",
                  header: "Due Date",
                  render: (row) =>
                    new Date(row.dueDate).toLocaleDateString("en-IN"),
                },
                {
                  key: "amount",
                  header: "Amount",
                  render: (row) => formatCurrency(Number(row.amount)),
                },
                {
                  key: "paidAmount",
                  header: "Paid",
                  render: (row) => formatCurrency(Number(row.paidAmount)),
                },
                {
                  key: "status",
                  header: "Status",
                  render: (row) => <StatusBadge status={row.status} />,
                },
                {
                  key: "actions",
                  header: "Actions",
                  render: (row) =>
                    row.status !== "PAID" ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Amount"
                          className="w-24 rounded border px-2 py-1 text-xs"
                          onChange={(e) => setPayAmount(Number(e.target.value))}
                        />
                        <Button
                          size="sm"
                          variant="accent"
                          disabled={recordingId === row.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            void recordPayment(row.id);
                          }}
                        >
                          Record
                        </Button>
                      </div>
                    ) : row.receipt?.pdfUrl ? (
                      <a
                        href={`${API_ORIGIN}${row.receipt.pdfUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-accent hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Receipt PDF
                      </a>
                    ) : null,
                },
              ]}
            />
          )}
        </CardContent>
      </Card>
    </PageLayout>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): React.ReactElement {
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
