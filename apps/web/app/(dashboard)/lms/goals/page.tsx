"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLmsGoals } from "@/hooks/use-lms";
import { api } from "@/lib/api";

type GoalRow = {
  id: string;
  project?: { name: string } | null;
  month: number;
  year: number;
  targetEnquiries: number;
  targetSiteVisits: number;
  targetBookings: number;
};

export default function LmsGoalsPage(): React.ReactElement {
  const { data: goals, isLoading } = useLmsGoals();
  const items = ((goals ?? []) as GoalRow[]) ?? [];
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    projectId: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    targetEnquiries: 200,
    targetSiteVisits: 80,
    targetBookings: 30,
    targetRevenue: 20000000,
  });

  const save = useMutation({
    mutationFn: () => api.post("/lms/goals", form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lms", "goals"] });
      setShowForm(false);
    },
  });

  return (
    <PageLayout
      title="Goals & Targets"
      back="/lms"
      actions={
        <Button variant="accent" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "New Goal"}
        </Button>
      }
    >
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Goals Form</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Project ID"
              value={form.projectId}
              onChange={(e) => setForm({ ...form, projectId: e.target.value })}
            />
            <input
              type="number"
              className="rounded border px-3 py-2 text-sm"
              placeholder="Target Enquiries"
              value={form.targetEnquiries}
              onChange={(e) => setForm({ ...form, targetEnquiries: +e.target.value })}
            />
            <input
              type="number"
              className="rounded border px-3 py-2 text-sm"
              placeholder="Target Site Visits"
              value={form.targetSiteVisits}
              onChange={(e) => setForm({ ...form, targetSiteVisits: +e.target.value })}
            />
            <input
              type="number"
              className="rounded border px-3 py-2 text-sm"
              placeholder="Target Bookings"
              value={form.targetBookings}
              onChange={(e) => setForm({ ...form, targetBookings: +e.target.value })}
            />
            <Button onClick={() => save.mutate()} disabled={!form.projectId}>
              Save Goal
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="p-8 text-center text-slate-500">Loading...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((goal) => (
            <Card key={goal.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {goal.project?.name ?? "Project"} — {goal.month}/{goal.year}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {[
                  ["Enquiries", goal.targetEnquiries],
                  ["Site Visits", goal.targetSiteVisits],
                  ["Bookings", goal.targetBookings],
                ].map(([label, target]) => (
                  <div key={label as string}>
                    <div className="mb-1 flex justify-between">
                      <span>{label as string}</span>
                      <span>0/{target as number}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 w-1/3 rounded-full bg-primary" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
