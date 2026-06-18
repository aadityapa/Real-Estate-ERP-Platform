import Link from "next/link";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const reports = [
  { href: "/lms/reports/call-log", title: "Lead Call Log Report", desc: "Call history with duration and status" },
  { href: "/lms/reports/site-visits", title: "Site Visited Report", desc: "Site visits with YPSR status" },
  { href: "/lms/reports/digital-hoarding", title: "Digital Hoarding Report", desc: "Campaign impressions and CPL" },
  { href: "/lms/reports/digital-enquiry", title: "Digital Enquiry Report", desc: "Online leads by source and UTM" },
  { href: "/lms/reports/lead-tracking", title: "Lead Tracking Report", desc: "Lead level, stage, and follow-ups" },
  { href: "/lms/reports/da-report", title: "DA Report", desc: "Daily activity per sales person" },
];

export default function LmsReportsIndexPage(): React.ReactElement {
  return (
    <PageLayout title="LMS Reports" back="/lms">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <Link key={r.href} href={r.href}>
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-base">{r.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">{r.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </PageLayout>
  );
}
