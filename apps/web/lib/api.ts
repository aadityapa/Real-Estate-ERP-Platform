import type { ApiResponse, ApiError, PaginationMeta } from "@propos/shared-types";
import { useAuthStore } from "@/stores/auth-store";

const API_URL =
  process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001/api/v1";

export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export interface PaginatedApiResponse<T> {
  data: T;
  meta: PaginationMeta;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = useAuthStore.getState().getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const body = (await response.json()) as ApiResponse<T> | ApiError;

  if (!response.ok || !body.success) {
    const error = body as ApiError;
    throw new ApiClientError(
      error.error?.code ?? "UNKNOWN_ERROR",
      error.error?.message ?? "Request failed",
      error.error?.details,
    );
  }

  return (body as ApiResponse<T>).data;
}

async function requestPaginated<T>(
  path: string,
  options: RequestInit = {},
): Promise<PaginatedApiResponse<T>> {
  const token = useAuthStore.getState().getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const body = (await response.json()) as ApiResponse<T> | ApiError;

  if (!response.ok || !body.success) {
    const error = body as ApiError;
    throw new ApiClientError(
      error.error?.code ?? "UNKNOWN_ERROR",
      error.error?.message ?? "Request failed",
    );
  }

  const successBody = body as ApiResponse<T>;
  return {
    data: successBody.data,
    meta: successBody.meta ?? {
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
    },
  };
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  getPaginated: <T>(path: string) =>
    requestPaginated<T[]>(path, { method: "GET" }),
  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(data) }),
  patch: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
