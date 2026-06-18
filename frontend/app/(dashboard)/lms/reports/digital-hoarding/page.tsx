import { ReportPage } from "@/components/lms/report-page";

export default function DigitalHoardingReportPage(): React.ReactElement {
  return (
    <ReportPage
      title="Digital Hoarding Report"
      reportType="digital-hoarding"
      columns={[
        { key: "campaignName", label: "Campaign" },
        { key: "platform", label: "Platform" },
        { key: "impressions", label: "Impressions" },
        { key: "clicks", label: "Clicks" },
        { key: "leadsGenerated", label: "Leads" },
        {
          key: "cpl",
          label: "CPL",
          render: (row) =>
            `₹${Math.round(row["cpl"] as number).toLocaleString("en-IN")}`,
        },
      ]}
    />
  );
}
