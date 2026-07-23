/**
 * Permission codes stored as `module:action:resource` in JWT payloads.
 * Super Admin bypasses Checks in PermissionsGuard.
 */
export const Permissions = {
  ADMIN_COMPANIES_READ: "admin:read:companies",
  ADMIN_COMPANIES_WRITE: "admin:write:companies",
  ADMIN_USERS_READ: "admin:read:users",
  ADMIN_USERS_WRITE: "admin:write:users",
  ADMIN_PROJECTS_READ: "admin:read:projects",
  ADMIN_PROJECTS_WRITE: "admin:write:projects",
  ADMIN_TAB_LOGINS_WRITE: "admin:write:tab-logins",
  ADMIN_USAGE_READ: "admin:read:usage",
  ADMIN_USAGE_WRITE: "admin:write:usage",
  /** SaaS subscription billing (plans, invoices, upgrade). */
  ADMIN_BILLING_READ: "admin:read:billing",
  ADMIN_BILLING_WRITE: "admin:write:billing",
  /** DPDP / GDPR tenant data-portability export. */
  ADMIN_LIFECYCLE_EXPORT: "admin:export:tenant",
  /** DPDP / GDPR tenant hard-delete (right to erasure). */
  ADMIN_LIFECYCLE_DELETE: "admin:delete:tenant",

  FINANCE_LEDGER_READ: "finance:read:ledger",
  FINANCE_LEDGER_WRITE: "finance:write:ledger",
  FINANCE_BUDGET_READ: "finance:read:budget",
  FINANCE_BUDGET_WRITE: "finance:write:budget",

  HR_EMPLOYEES_READ: "hr:read:employees",
  HR_EMPLOYEES_WRITE: "hr:write:employees",
  HR_ATTENDANCE_READ: "hr:read:attendance",
  HR_ATTENDANCE_WRITE: "hr:write:attendance",
  HR_LEAVES_READ: "hr:read:leaves",
  HR_LEAVES_WRITE: "hr:write:leaves",

  CRM_LEADS_READ: "crm:read:leads",
  CRM_LEADS_WRITE: "crm:write:leads",
  /** Assign any lead / edit unassigned or others' leads (managers). */
  CRM_LEADS_MANAGE: "crm:manage:leads",

  SALES_BOOKINGS_READ: "sales:read:bookings",
  SALES_BOOKINGS_WRITE: "sales:write:bookings",
  SALES_PAYMENTS_READ: "sales:read:payments",
  SALES_PAYMENTS_WRITE: "sales:write:payments",
  SALES_INVENTORY_READ: "sales:read:inventory",
  SALES_INVENTORY_WRITE: "sales:write:inventory",

  LEGAL_CASES_READ: "legal:read:cases",
  LEGAL_CASES_WRITE: "legal:write:cases",

  DOCUMENTS_READ: "documents:read:files",
  DOCUMENTS_WRITE: "documents:write:files",

  VENDORS_READ: "vendors:read:vendors",
  VENDORS_WRITE: "vendors:write:vendors",

  SUPPORT_ADMIN: "support:admin:tickets",
  SUPPORT_WRITE: "support:write:tickets",
} as const;

export type PermissionCode =
  (typeof Permissions)[keyof typeof Permissions];

export const ALL_PERMISSION_CODES: PermissionCode[] =
  Object.values(Permissions);

/** Role names that can manage CRM leads (edit/assign beyond own assignments). */
export const CRM_MANAGER_ROLES = [
  "Super Admin",
  "Admin",
  "Sales Manager",
] as const;

export function isCrmLeadManager(
  roles: string[],
  permissions: string[] = [],
): boolean {
  if (roles.some((r) => (CRM_MANAGER_ROLES as readonly string[]).includes(r))) {
    return true;
  }
  return permissions.includes(Permissions.CRM_LEADS_MANAGE);
}
