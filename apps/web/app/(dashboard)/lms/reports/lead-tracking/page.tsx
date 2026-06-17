import { ReportPage } from "@/components/lms/report-page";
import { LeadLabelBadge } from "@/components/lms/lead-badges";

export default function LeadTrackingReportPage(): React.ReactElement {
  return (
    <ReportPage
      title="Lead Tracking Report"
      reportType="lead-tracking"
      columns={[
        { key: "leadName", label: "Lead Name" },
        {
          key: "leadLevel",
          label: "Lead Level",
          render: (row) => (
            <LeadLabelBadge
              label={
                row["leadLevel"] as "HOT" | "WARM" | "COLD" | "LOST"
              }
            />
          ),
        },
        { key: "stage", label: "Stage" },
        { key: "followUpsDone", label: "Follow-ups Done" },
        {
          key: "lastContact",
          label: "Last Contact",
          render: (row) =>
            new Date(row["lastContact"] as string).toLocaleDateString(),
        },
        {
          key: "nextFollowUp",
          label: "Next Follow-up",
          render: (row) =>
            row["nextFollowUp"]
              ? new Date(row["nextFollowUp"] as string).toLocaleDateString()
              : "—",
        },
        { key: "salesPerson", label: "Sales Person" },
      ]}
    />
  );
}
