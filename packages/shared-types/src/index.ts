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

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: "asc" | "desc";
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

export type PlanType = "STARTER" | "GROWTH" | "ENTERPRISE";
export type Status = "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type LeadStatus =
  | "NEW"
  | "CONTACTED"
  | "INTERESTED"
  | "SITE_VISIT"
  | "NEGOTIATION"
  | "BOOKING"
  | "AGREEMENT"
  | "REGISTRATION"
  | "POSSESSION"
  | "LOST";

export type LeadSource =
  | "WEBSITE"
  | "FACEBOOK"
  | "GOOGLE"
  | "WHATSAPP"
  | "PORTAL"
  | "WALKIN"
  | "REFERRAL"
  | "OTHER";

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
