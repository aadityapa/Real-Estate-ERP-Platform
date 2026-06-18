/** Frontend API contract types (mirrors backend response shape). */

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
  message?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface JwtPayload {
  userId: string;
  tenantId: string;
  email: string;
  roles: string[];
  permissions: string[];
  allowedTabs?: string[];
  defaultTab?: string;
  tabId?: string;
}
