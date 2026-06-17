"use client";

import { useState } from "react";
import { Phone } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAppointments } from "@/hooks/use-lms";

type AppointmentRow = {
  id: string;
  type: "CALL" | "SITE_VISIT" | "MEETING" | "FOLLOW_UP";
  scheduledAt: string;
  lead: {
    firstName: string;
    lastName?: string | null;
    phone: string;
    project?: { name: string } | null;
  };
};

export default function AppointmentsPage(): React.ReactElement {
  const [tab, setTab] = useState("today");
  const { data, isLoading } = useAppointments(tab);
  const items = (data ?? []) as AppointmentRow[];

  const tabs = [
    { key: "pending", label: "Pending" },
    { key: "today", label: "Today's" },
    { key: "upcoming", label: "Upcoming" },
  ];

  return (
    <PageLayout title="Appointments" back="/lms">
      <div className="mb-4 flex gap-2">
        {tabs.map((t) => (
          <Button
            key={t.key}
            variant={tab === t.key ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-slate-500">Loading...</div>
      ) : (
        <div className="space-y-3">
          {items.length === 0 ? (
            <p className="text-slate-500">No appointments in this tab.</p>
          ) : (
            items.map((appt) => {
              const lead = appt.lead;
              const isPending = tab === "pending";
              return (
                <Card
                  key={appt.id}
                  className={isPending ? "border-red-200" : ""}
                >
                  <CardContent className="flex items-center justify-between pt-4">
                    <div>
                      <p className="font-medium">
                        {appt.type} — {lead.firstName} {lead.lastName ?? ""}
                      </p>
                      <p className="text-sm text-slate-500">
                        {new Date(appt.scheduledAt).toLocaleString()} •{" "}
                        {lead.project?.name ?? "—"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={`tel:${lead.phone}`}>
                          <Phone className="h-4 w-4" />
                        </a>
                      </Button>
                      {isPending && (
                        <>
                          <Button variant="outline" size="sm">Reschedule</Button>
                          <Button variant="accent" size="sm">Done</Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}
    </PageLayout>
  );
}
