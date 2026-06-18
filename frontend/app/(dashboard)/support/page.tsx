"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSupportTickets } from "@/hooks/use-lms";
import { api } from "@/lib/api";

type TicketRow = {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
};

export default function SupportPage(): React.ReactElement {
  const { data, isLoading } = useSupportTickets();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ subject: "", description: "", category: "OTHER" });
  const [reply, setReply] = useState("");

  const tickets = ((data?.data ?? []) as TicketRow[]) ?? [];
  const active = tickets.find((t) => t.id === selected) ?? tickets[0];

  const createTicket = useMutation({
    mutationFn: () => api.post("/support/tickets", form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support"] });
      setShowNew(false);
      setForm({ subject: "", description: "", category: "OTHER" });
    },
  });

  const sendReply = useMutation({
    mutationFn: () =>
      api.post(`/support/tickets/${active?.id ?? ""}/reply`, { message: reply }),
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["support"] });
    },
  });

  return (
    <PageLayout
      title="Support"
      actions={
        <Button variant="accent" onClick={() => setShowNew(!showNew)}>
          New Ticket
        </Button>
      }
    >
      {showNew && (
        <Card className="mb-4">
          <CardContent className="grid gap-3 pt-4 md:grid-cols-2">
            <input
              className="rounded border px-3 py-2 text-sm"
              placeholder="Subject"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
            <select
              className="rounded border px-3 py-2 text-sm"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {["LOGIN", "DATA", "REPORT", "BUG", "FEATURE_REQUEST", "OTHER"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <textarea
              className="md:col-span-2 rounded border px-3 py-2 text-sm"
              placeholder="Describe your issue..."
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <Button onClick={() => createTicket.mutate()}>Submit Ticket</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="space-y-2 pt-4">
            {isLoading ? (
              <p className="text-sm text-slate-500">Loading...</p>
            ) : tickets.length === 0 ? (
              <p className="text-sm text-slate-500">No tickets yet.</p>
            ) : (
              tickets.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`w-full rounded-lg border p-3 text-left text-sm ${
                    active?.id === t.id ? "border-primary bg-primary/5" : ""
                  }`}
                  onClick={() => setSelected(t.id)}
                >
                  <p className="font-medium">{t.ticketNumber}</p>
                  <p className="truncate text-slate-600">{t.subject}</p>
                  <p className="text-xs text-slate-400">{t.status}</p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="pt-4">
            {active ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{active.subject}</h3>
                  <p className="text-sm text-slate-500">
                    {active.ticketNumber} • {active.status} • {active.priority}
                  </p>
                </div>
                <p className="text-sm">{active.description}</p>
                <div className="flex gap-2">
                  <input
                    className="flex-1 rounded border px-3 py-2 text-sm"
                    placeholder="Write a reply..."
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                  />
                  <Button onClick={() => sendReply.mutate()} disabled={!reply}>
                    Reply
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-slate-500">Select a ticket to view details.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
