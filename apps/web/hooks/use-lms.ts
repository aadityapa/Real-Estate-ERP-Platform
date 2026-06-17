import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useLmsCounters(projectId?: string) {
  return useQuery({
    queryKey: ["lms", "counters", projectId],
    queryFn: () =>
      api.get<{
        totalEnquiries: number;
        siteVisits: number;
        bookingsDone: number;
        conversionRatio: number;
        inventoryAvailable: number;
        totalProjects: number;
      }>(`/lms/dashboard/counters${projectId ? `?projectId=${projectId}` : ""}`),
  });
}

export function useLmsLeaderboard() {
  return useQuery({
    queryKey: ["lms", "leaderboard"],
    queryFn: () =>
      api.get<
        Array<{
          rank: number;
          userId: string;
          name: string;
          totalLeads: number;
          siteVisits: number;
          bookings: number;
          conversionRate: number;
        }>
      >("/lms/dashboard/leaderboard"),
  });
}

export function useLmsFunnel() {
  return useQuery({
    queryKey: ["lms", "funnel"],
    queryFn: () =>
      api.get<Array<{ stage: string; count: number }>>("/lms/dashboard/funnel"),
  });
}

export function useLmsSources() {
  return useQuery({
    queryKey: ["lms", "sources"],
    queryFn: () =>
      api.get<Array<{ source: string; count: number }>>("/lms/dashboard/sources"),
  });
}

export function useClashLeads() {
  return useQuery({
    queryKey: ["lms", "clash-leads"],
    queryFn: () => api.get("/lms/dashboard/clash-leads?status=PENDING"),
  });
}

export function useLmsGoals() {
  return useQuery({
    queryKey: ["lms", "goals"],
    queryFn: () => api.get("/lms/goals"),
  });
}

export function useDataFeedStats() {
  return useQuery({
    queryKey: ["lms", "data-feed", "stats"],
    queryFn: () =>
      api.get<{
        unclaimed: number;
        claimed: number;
        myClaimed: number;
        agingCount: number;
      }>("/lms/data-feed/stats"),
    refetchInterval: 30000,
  });
}

export function useDataFeed(status?: string) {
  return useQuery({
    queryKey: ["lms", "data-feed", status],
    queryFn: () =>
      api.getPaginated(`/lms/data-feed${status ? `?status=${status}` : ""}`),
    refetchInterval: 30000,
  });
}

export function useClaimLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (leadId: string) => api.post(`/lms/data-feed/${leadId}/claim`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lms", "data-feed"] });
    },
  });
}

export function useLmsLeads(params?: Record<string, string>) {
  const qs = params
    ? `?${new URLSearchParams(params).toString()}`
    : "";
  return useQuery({
    queryKey: ["lms", "leads", params],
    queryFn: () => api.getPaginated(`/lms/leads${qs}`),
  });
}

export function useAppointments(tab: string) {
  return useQuery({
    queryKey: ["lms", "appointments", tab],
    queryFn: () => api.get(`/lms/appointments?tab=${tab}`),
  });
}

export function useLmsReport(type: string, filters?: Record<string, string>) {
  const qs = filters
    ? `?${new URLSearchParams(filters).toString()}`
    : "";
  return useQuery({
    queryKey: ["lms", "report", type, filters],
    queryFn: () => api.get(`/lms/reports/${type}${qs}`),
  });
}

export function useSupportTickets() {
  return useQuery({
    queryKey: ["support", "tickets"],
    queryFn: () => api.getPaginated("/support/tickets"),
  });
}

export function useTabLogins() {
  return useQuery({
    queryKey: ["admin", "tab-logins"],
    queryFn: () => api.get("/admin/tab-logins"),
  });
}
