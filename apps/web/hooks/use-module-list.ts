"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PaginationMeta } from "@/lib/types/api";

export function useModuleList<T extends { id: string }>(
  endpoint: string,
  filters: Record<string, string | number | undefined> = {},
) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== "") params.set(k, String(v));
  });

  const query = params.toString();

  return useQuery({
    queryKey: [endpoint, filters],
    queryFn: async () => {
      const res = await api.getPaginated<T>(
        `${endpoint}${query ? `?${query}` : ""}`,
      );
      return res as { data: T[]; meta: PaginationMeta };
    },
  });
}

export function useModuleItem<T>(endpoint: string, id: string) {
  return useQuery({
    queryKey: [endpoint, id],
    queryFn: () => api.get<T>(`${endpoint}/${id}`),
    enabled: !!id,
  });
}
