import { ReportPage } from "@/components/lms/report-page";

export default function CallLogReportPage(): React.ReactElement {
  return (
    <ReportPage
      title="Lead Call Log Report"
      reportType="call-log"
      columns={[
        { key: "leadName", label: "Lead Name" },
        { key: "phone", label: "Phone" },
        { key: "callType", label: "Call Type" },
        { key: "duration", label: "Duration" },
        { key: "status", label: "Status" },
        { key: "salesPerson", label: "Sales Person" },
        {
          key: "dateTime",
          label: "Date & Time",
          render: (row) =>
            new Date(row["dateTime"] as string).toLocaleString(),
        },
      ]}
    />
  );
}
