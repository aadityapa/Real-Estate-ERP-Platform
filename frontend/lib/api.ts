import type { ApiResponse, ApiError, PaginationMeta } from "@/lib/types/api";
import { API_URL } from "@/lib/env";
import { useAuthStore } from "@/stores/auth-store";

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

/** Single-flight refresh — concurrent 401s share one refresh request. */
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) return false;

  refreshPromise ??= (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      const body = (await res.json()) as ApiResponse<{
        accessToken: string;
        refreshToken: string;
      }>;
      if (!res.ok || !body.success) return false;

      const state = useAuthStore.getState();
      if (!state.user) return false;
      state.setAuth({
        accessToken: body.data.accessToken,
        refreshToken: body.data.refreshToken,
        user: state.user,
      });
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function handleAuthFailure(): void {
  useAuthStore.getState().logout();
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
  }
}

async function authFetch(
  path: string,
  options: RequestInit = {},
  retried = false,
): Promise<Response> {
  const token = useAuthStore.getState().getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });

  // Access token expired — transparently refresh once and retry.
  if (response.status === 401 && !retried && !path.startsWith("/auth/")) {
    const refreshed = await tryRefreshToken();
    if (refreshed) return authFetch(path, options, true);
    handleAuthFailure();
  }

  return response;
}

async function parseBody<T>(response: Response): Promise<ApiResponse<T> | ApiError> {
  try {
    return (await response.json()) as ApiResponse<T> | ApiError;
  } catch {
    return {
      success: false,
      error: {
        code: `HTTP_${response.status}`,
        message: response.statusText || "Request failed",
      },
    } as ApiError;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await authFetch(path, options);
  const body = await parseBody<T>(response);

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
  const response = await authFetch(path, options);
  const body = await parseBody<T>(response);

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
