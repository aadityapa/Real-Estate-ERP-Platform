/**
 * Tenant ownership classification for structural Prisma scoping (Phase 3.1).
 *
 * DIRECT_TENANT_MODELS — have a `tenantId` column; the tenant extension
 * auto-injects / requires it when TenantContext is active.
 *
 * GLOBAL_MODELS — not tenant-owned; extension never injects.
 *
 * RELATION_SCOPED_MODELS — no direct `tenantId`; isolate via parent relations
 * (e.g. company.tenantId, project.company.tenantId, lead.tenantId). The
 * extension cannot safely auto-filter these; services must keep explicit
 * relation filters. Listed for documentation and lint awareness.
 */

/** Prisma model names (PascalCase) with a direct `tenantId` column. */
export const DIRECT_TENANT_MODELS = [
  "AuditLog",
  "Company",
  "User",
  "Role",
  "Lead",
  "TabLoginConfig",
  "LmsGoal",
  "ClashLead",
  "Appointment",
  "HelpdeskTicket",
  "DaReport",
  "Customer",
  "Vendor",
  "LedgerEntry",
  "GSTInvoice",
  "TdsEntry",
  "Document",
  "ReraProjectProfile",
  "ReraPaymentStage",
  "AgreementTemplate",
  "ESignRequest",
  "Campaign",
  "ChannelPartner",
  "LegalCase",
  "Asset",
  "Subscription",
  "TenantLimits",
  "GatewayPayment",
  "GatewayRefund",
  "SaasInvoice",
] as const;

export type DirectTenantModel = (typeof DIRECT_TENANT_MODELS)[number];

export const DIRECT_TENANT_MODEL_SET: ReadonlySet<string> = new Set(
  DIRECT_TENANT_MODELS,
);

/** Truly global / system tables (allowlist — never auto-scoped). */
/** Webhook intake is provider-global; tenantId is optional / resolved later. */
export const GLOBAL_MODELS = [
  "Tenant",
  "Permission",
  "GatewayWebhookEvent",
] as const;

export type GlobalModel = (typeof GLOBAL_MODELS)[number];

export const GLOBAL_MODEL_SET: ReadonlySet<string> = new Set(GLOBAL_MODELS);

/**
 * Models without `tenantId` that must be filtered through relations.
 * Not exhaustive of every join table; covers primary domain aggregates.
 */
export const RELATION_SCOPED_MODELS = [
  "Project", // → Company.tenantId
  "Branch", // → Company.tenantId
  "Employee", // → Company.tenantId
  "Attendance", // → Employee → Company
  "Leave", // → Employee → Company
  "Payslip", // → Employee → Company
  "Expense", // → Employee → Company
  "Session", // → User.tenantId
  "UserRole", // → User / Role
  "RolePermission", // → Role.tenantId
  "FollowUp", // → Lead.tenantId
  "CallLog", // → Lead.tenantId
  "SiteVisit", // → Lead / Project
  "YpsrReport", // → Project → Company
  "TicketReply", // → HelpdeskTicket.tenantId
  "Meeting", // → Lead.tenantId
  "Tower", // → Project → Company
  "Building", // → Project → Company
  "Unit", // → Project → Company
  "Booking", // → Lead / Customer.tenantId
  "PaymentPlan", // → Project → Company
  "Payment", // → Booking → …
  "Receipt", // → Booking → …
  // GatewayPayment / GatewayRefund are DIRECT (tenantId column)
  "Agreement", // → Booking → …
  "Complaint", // → Customer.tenantId
  "SupportTicket", // → Customer.tenantId
  "Milestone", // → Project → Company
  "DailyProgressReport", // → Project → Company
  "QualityCheck", // → Project → Company
  "VendorContract", // → Vendor.tenantId
  "PurchaseRequisition", // → Project → Company
  "PurchaseOrder", // → Vendor / Project
  "GoodsReceiptNote", // → PurchaseOrder → …
  "InventoryItem", // → Project → Company
  "Budget", // → Project → Company
  "VendorPayment", // → Vendor.tenantId
  "DocumentVersion", // → Document.tenantId
  "Commission", // → ChannelPartner.tenantId
  "MaintenanceLog", // → Asset.tenantId
  "BOQ", // → Project → Company
  "Notification", // → User.tenantId
  "Activity", // → User.tenantId
] as const;

export function isDirectTenantModel(model: string | undefined): boolean {
  return Boolean(model && DIRECT_TENANT_MODEL_SET.has(model));
}

export function isGlobalModel(model: string | undefined): boolean {
  return Boolean(model && GLOBAL_MODEL_SET.has(model));
}
