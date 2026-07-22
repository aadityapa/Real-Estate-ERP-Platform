"use client";

import { ReportPage } from "@/components/lms/report-page";

export default function DaReportPage(): React.ReactElement {
  return (
    <ReportPage
      title="DA Report (Daily Activity)"
      reportType="da-report"
      columns={[
        { key: "salesPerson", label: "Sales Person" },
        { key: "callsMade", label: "Calls Made" },
        { key: "leadsContacted", label: "Leads Contacted" },
        { key: "siteVisits", label: "Site Visits" },
        { key: "followUpsDone", label: "Follow-ups Done" },
        { key: "newLeadsAssigned", label: "New Leads Assigned" },
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