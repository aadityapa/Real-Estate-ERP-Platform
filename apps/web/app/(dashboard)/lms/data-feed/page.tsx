"use client";

import { useState } from "react";
import { Phone, AlertTriangle } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDataFeed, useDataFeedStats, useClaimLead } from "@/hooks/use-lms";

type DataFeedLead = {
  id: string;
  firstName: string;
  lastName?: string | null;
  phone: string;
  source: string;
  assignedToId?: string | null;
  minutesSinceCreation: number;
  isAging: boolean;
  project?: { name: string } | null;
};

export default function DataFeedPage(): React.ReactElement {
  const [tab, setTab] = useState<string>("");
  const { data: stats } = useDataFeedStats();
  const { data, isLoading } = useDataFeed(tab || undefined);
  const claim = useClaimLead();

  const items = ((data?.data ?? []) as DataFeedLead[]) ?? [];
  const tabs = [
    { key: "", label: "All" },
    { key: "UNCLAIMED", label: `Unclaimed (${stats?.unclaimed ?? 0})` },
    { key: "CLAIMED", label: "Claimed" },
  ];

  return (
    <PageLayout title="Data Feed" back="/lms">
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
        <div className="p-8 text-center text-slate-500">Loading feed...</div>
      ) : (
        <div className="space-y-3">
          {items.map((lead) => {
            const unclaimed = !lead.assignedToId;
            const aging = lead.isAging;
            return (
              <Card
                key={lead.id}
                className={unclaimed ? "border-l-4 border-l-red-500" : "border-l-4 border-l-green-500"}
              >
                <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-4">
                  <div>
                    <p className="font-semibold">
                      {unclaimed ? "🔴 UNCLAIMED" : "🟢 CLAIMED"} •{" "}
                      {lead.minutesSinceCreation} min ago
                      {aging && (
                        <span className="ml-2 text-amber-600">
                          <AlertTriangle className="inline h-4 w-4" /> Aging
                        </span>
                      )}
                    </p>
                    <p className="mt-1">
                      {lead.firstName} {lead.lastName ?? ""} |{" "}
                      <Phone className="inline h-3 w-3" /> {lead.phone} |{" "}
                      {lead.source}
                    </p>
                    <p className="text-sm text-slate-500">
                      Project: {lead.project?.name ?? "Not specified"}
                    </p>
                  </div>
                  {unclaimed && (
                    <Button
                      variant="accent"
                      size="sm"
                      onClick={() => claim.mutate(lead.id)}
                      disabled={claim.isPending}
                    >
                      Claim Lead →
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
}
