"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PaginationMeta } from "@propos/shared-types";

export interface Lead {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone: string;
  source: string;
  status: string;
  priority: string;
  score: number;
  location?: string | null;
  createdAt: string;
  assignedTo?: { id: string; firstName: string; lastName: string } | null;
  project?: { id: string; name: string; code: string } | null;
  _count?: { followUps: number; siteVisits: number };
}

export interface LeadFilters {
  page?: number;
  limit?: number;
  status?: string;
  source?: string;
  search?: string;
}

export function useLeads(filters: LeadFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v) params.set(k, String(v));
  });

  return useQuery({
    queryKey: ["leads", filters],
    queryFn: async () => {
      const res = await api.getPaginated<Lead>(`/crm/leads?${params}`);
      return res as { data: Lead[]; meta: PaginationMeta };
    },
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: ["lead", id],
    queryFn: () => api.get<Lead>(`/crm/leads/${id}`),
    enabled: !!id,
  });
}

export function useCrmDashboard() {
  return useQuery({
    queryKey: ["crm-dashboard"],
    queryFn: () =>
      api.get<{
        totalLeads: number;
        leadsBySource: { source: string; count: number }[];
        leadsByStatus: { status: string; count: number }[];
        followUpsToday: number;
        siteVisitsToday: number;
        conversionRate: number;
      }>("/crm/leads/dashboard"),
  });
}

export function useLeadPipeline() {
  return useQuery({
    queryKey: ["lead-pipeline"],
    queryFn: () =>
      api.get<{ status: string; count: number }[]>("/crm/leads/pipeline"),
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post<Lead>("/crm/leads", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["leads"] });
      void qc.invalidateQueries({ queryKey: ["crm-dashboard"] });
      void qc.invalidateQueries({ queryKey: ["lead-pipeline"] });
    },
  });
}

export function useUpdateLead(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.patch<Lead>(`/crm/leads/${id}`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["leads"] });
      void qc.invalidateQueries({ queryKey: ["lead", id] });
      void qc.invalidateQueries({ queryKey: ["lead-pipeline"] });
    },
  });
}
