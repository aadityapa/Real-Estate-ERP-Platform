"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

interface Lead {
  id: string;
  firstName: string;
  lastName?: string;
  phone: string;
  aiScore?: number;
}

type AiResult = {
  label: string;
  data: unknown;
};

export default function AiPage(): React.ReactElement {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<AiResult[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState("");

  const { data: leadsData } = useQuery({
    queryKey: ["ai-leads"],
    queryFn: () => api.getPaginated<Lead>("/crm/leads?limit=20"),
  });

  const leads = leadsData?.data ?? [];

  const callAi = async (endpoint: string, label: string, body: unknown) => {
    setLoading(endpoint);
    try {
      const data = await api.post(endpoint, body);
      setResults((prev) => [{ label, data }, ...prev]);
    } catch (err) {
      setResults((prev) => [
        {
          label: `${label} (error)`,
          data: { error: err instanceof Error ? err.message : "Failed" },
        },
        ...prev,
      ]);
    } finally {
      setLoading(null);
    }
  };

  return (
    <PageLayout title="AI Assistant">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              GPT-4o Lead Intelligence
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select Lead</label>
              <select
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              >
                <option value="">Choose a lead...</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.firstName} {lead.lastName ?? ""} — {lead.phone}
                    {lead.aiScore != null ? ` (AI: ${lead.aiScore})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="accent"
                disabled={!selectedLeadId || loading === "/ai/lead-score"}
                onClick={() =>
                  callAi("/ai/lead-score", "Lead Score (GPT-4o)", {
                    leadId: selectedLeadId,
                  })
                }
              >
                {loading === "/ai/lead-score" ? "Scoring..." : "Score Lead"}
              </Button>
              <Button
                variant="outline"
                disabled={!selectedLeadId || loading === "/ai/suggest-follow-up"}
                onClick={() =>
                  callAi("/ai/suggest-follow-up", "Follow-up Suggestion", {
                    leadId: selectedLeadId,
                  })
                }
              >
                {loading === "/ai/suggest-follow-up"
                  ? "Generating..."
                  : "Suggest Follow-up"}
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Powered by OpenAI GPT-4o. Set OPENAI_API_KEY in API .env. Falls back
              to rule-based scoring if unavailable.
            </p>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {results.map((result, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-slate-50 p-4"
                >
                  <p className="mb-2 text-sm font-medium text-slate-700">
                    {result.label}
                  </p>
                  <pre className="overflow-x-auto text-xs text-slate-600">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
