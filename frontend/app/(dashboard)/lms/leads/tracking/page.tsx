"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LeadLabelBadge, CallStatusBadge } from "@/components/lms/lead-badges";
import { api } from "@/lib/api";

type TrackedLead = {
  firstName: string;
  lastName?: string | null;
  leadLabel?: "HOT" | "WARM" | "COLD" | "LOST";
  leadCallStatus?: "ANSWERED" | "MISSED" | "PENDING";
  phone: string;
  description?: string | null;
  project?: { name: string } | null;
  leadRat?: number;
};

export default function LeadTrackingPage(): React.ReactElement {
  const params = useSearchParams();
  const leadId = params.get("id") ?? "";

  const { data, isLoading } = useQuery({
    queryKey: ["lms", "tracking", leadId],
    queryFn: () =>
      api.get<{
        lead: Record<string, unknown>;
        timeline: Array<{
          type: string;
          date: string;
          title: string;
          detail?: string;
        }>;
      }>(`/lms/leads/tracking/${leadId}`),
    enabled: !!leadId,
  });

  const lead = data?.lead as TrackedLead | undefined;

  return (
    <PageLayout title="Lead Tracking" back="/lms/leads">
      {!leadId ? (
        <p className="text-slate-500">Select a lead from All Leads to track.</p>
      ) : isLoading ? (
        <div className="p-8 text-center text-slate-500">Loading...</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>
                {lead?.firstName ?? ""} {lead?.lastName ?? ""}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex gap-4">
                <LeadLabelBadge label={lead?.leadLabel ?? "WARM"} />
                <CallStatusBadge
                  status={lead?.leadCallStatus ?? "PENDING"}
                />
              </div>
              <p>
                <span className="text-slate-500">Project:</span>{" "}
                {lead?.project?.name ?? "—"}
              </p>
              <p>
                <span className="text-slate-500">Phone:</span> {lead?.phone ?? "—"}
              </p>
              <p>
                <span className="text-slate-500">LeadRat:</span>{" "}
                {typeof lead?.leadRat === "number" ? lead.leadRat : "—"}
              </p>
              <p>
                <span className="text-slate-500">Notes:</span>{" "}
                {lead?.description ?? "—"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(data?.timeline ?? []).map((item, i) => (
                <div key={i} className="border-l-2 border-primary pl-4">
                  <p className="text-xs text-slate-500">
                    {new Date(item.date).toLocaleString()}
                  </p>
                  <p className="font-medium">{item.title}</p>
                  {item.detail && (
                    <p className="text-sm text-slate-600">{item.detail}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </PageLayout>
  );
}
