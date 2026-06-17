"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

export default function YpsrFormPage(): React.ReactElement {
  const params = useParams();
  const router = useRouter();
  const id = params["id"] as string;

  const [form, setForm] = useState({
    unitsShown: "",
    amenitiesPresented: "",
    leadFeedback: "",
    interestLevel: "MEDIUM",
    objections: "",
    followUpAction: "",
    outcome: "REVISIT_NEEDED",
  });
  type FormState = typeof form;
  type FormKey = keyof FormState;

  const submit = useMutation({
    mutationFn: () =>
      api.post(`/lms/site-visits/${id}/ypsr`, {
        unitsShown: form.unitsShown.split(",").map((s) => s.trim()).filter(Boolean),
        amenitiesPresented: form.amenitiesPresented.split(",").map((s) => s.trim()).filter(Boolean),
        leadFeedback: form.leadFeedback,
        interestLevel: form.interestLevel,
        objections: form.objections.split(",").map((s) => s.trim()).filter(Boolean),
        followUpAction: form.followUpAction,
        outcome: form.outcome,
        photos: [],
      }),
    onSuccess: () => router.push("/lms/site-visits"),
  });

  return (
    <PageLayout title="YPSR Report" back="/lms/site-visits">
      <Card>
        <CardHeader>
          <CardTitle>Your Project Site Report</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {[
            ["Units Shown (comma-separated)", "unitsShown"],
            ["Amenities Presented", "amenitiesPresented"],
            ["Lead Feedback", "leadFeedback"],
            ["Objections", "objections"],
            ["Follow-up Action", "followUpAction"],
          ].map(([label, key]) => {
            const k = key as FormKey;
            return (
            <div key={key}>
              <label className="mb-1 block text-sm text-slate-600">{label}</label>
              <input
                className="w-full rounded border px-3 py-2 text-sm"
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
              />
            </div>
          )})}
          <div>
            <label className="mb-1 block text-sm text-slate-600">Interest Level</label>
            <select
              className="w-full rounded border px-3 py-2 text-sm"
              value={form.interestLevel}
              onChange={(e) => setForm({ ...form, interestLevel: e.target.value })}
            >
              {["HIGH", "MEDIUM", "LOW", "NOT_INTERESTED"].map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-600">Outcome</label>
            <select
              className="w-full rounded border px-3 py-2 text-sm"
              value={form.outcome}
              onChange={(e) => setForm({ ...form, outcome: e.target.value })}
            >
              {["BOOKING_LIKELY", "REVISIT_NEEDED", "NEGOTIATING", "LOST"].map((o) => (
                <option key={o} value={o}>{o.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <Button variant="accent" onClick={() => submit.mutate()}>
              Submit YPSR
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
