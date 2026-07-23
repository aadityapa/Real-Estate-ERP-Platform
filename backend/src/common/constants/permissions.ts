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
  FINANCE_LEDGER_READ: "finance:read:ledger",
  FINANCE_LEDGER_WRITE: "finance:write:ledger",
  FINANCE_BUDGET_READ: "finance:read:budget",
  FINANCE_BUDGET_WRITE: "finance:write:budget",
  HR_EMPLOYEES_WRITE: "hr:write:employees",
  SUPPORT_ADMIN: "support:admin:tickets",
  SUPPORT_WRITE: "support:write:tickets",
} as const;

export type PermissionCode =
  (typeof Permissions)[keyof typeof Permissions];

export const ALL_PERMISSION_CODES: PermissionCode[] =
  Object.values(Permissions);
