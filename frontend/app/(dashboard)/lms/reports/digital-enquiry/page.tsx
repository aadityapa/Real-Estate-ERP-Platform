"use client";

import { ReportPage } from "@/components/lms/report-page";

export default function DigitalEnquiryReportPage(): React.ReactElement {
  return (
    <ReportPage
      title="Digital Enquiry Report"
      reportType="digital-enquiry"
      columns={[
        { key: "leadName", label: "Lead Name" },
        { key: "source", label: "Source" },
        { key: "campaign", label: "Campaign" },
        { key: "utmMedium", label: "UTM Medium" },
        { key: "project", label: "Project" },
        { key: "status", label: "Status" },
        { key: "assignedTo", label: "Assigned To" },
        {
          key: "date",
          label: "Date",
          render: (row) =>
            new Date(row["date"] as string).toLocaleDateString(),
        },
      ]}
    />
  );
}