"use client";

import { ReportPage } from "@/components/lms/report-page";

export default function SiteVisitsReportPage(): React.ReactElement {
  return (
    <ReportPage
      title="Site Visited Report"
      reportType="site-visits"
      columns={[
        { key: "leadName", label: "Lead Name" },
        { key: "project", label: "Project" },
        {
          key: "visitDate",
          label: "Visit Date",
          render: (row) =>
            new Date(row["visitDate"] as string).toLocaleString(),
        },
        { key: "salesPerson", label: "Sales Person" },
        { key: "interestLevel", label: "Interest Level" },
        { key: "outcome", label: "Outcome" },
        {
          key: "ypsrSubmitted",
          label: "YPSR",
          render: (row) => (row["ypsrSubmitted"] ? "Yes" : "No"),
        },
      ]}
    />
  );
}