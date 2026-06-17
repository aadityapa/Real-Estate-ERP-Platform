"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/tables/data-table";
import { useLmsReport } from "@/hooks/use-lms";

interface ReportColumn {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>) => React.ReactNode;
}

interface ReportPageProps {
  title: string;
  reportType: string;
  columns: ReportColumn[];
}

export function ReportPage({
  title,
  reportType,
  columns,
}: ReportPageProps): React.ReactElement {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const { data, isLoading } = useLmsReport(reportType, {
    ...(dateFrom && { dateFrom }),
    ...(dateTo && { dateTo }),
  });

  const rows = ((data as Record<string, unknown>[]) ?? []).map((row, i) => ({
    id: String(i),
    ...row,
  }));

  return (
    <PageLayout
      title={title}
      back="/lms/reports"
      actions={
        <Button variant="outline" size="sm">
          <Download className="mr-1 h-4 w-4" />
          Export
        </Button>
      }
    >
      <Card>
        <CardContent className="flex flex-wrap gap-4 pt-6">
          <div>
            <label className="mb-1 block text-xs text-slate-500">From</label>
            <input
              type="date"
              className="rounded border px-3 py-1.5 text-sm"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">To</label>
            <input
              type="date"
              className="rounded border px-3 py-1.5 text-sm"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="p-8 text-center text-slate-500">Loading report...</div>
      ) : (
        <DataTable
          columns={columns.map((c) => ({
            key: c.key,
            header: c.label,
            render: c.render
              ? (row: Record<string, unknown>) => c.render!(row)
              : undefined,
          }))}
          data={rows}
        />
      )}
    </PageLayout>
  );
}
