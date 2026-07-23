/**
 * Ordered raw SQL steps for tenant hard-delete (children → parent).
 * `$1` is always the tenant id. Used inside a transaction with
 * `app.propos_erasure=on` so AuditLog DELETE is allowed.
 *
 * Kept as data so unit tests can assert coverage / order without a DB.
 */

export interface TenantDeleteStep {
  /** Short label for logs (no PII). */
  label: string;
  sql: string;
}

/**
 * Dependency-respecting DELETE statements for PropOS schema.
 * Permission rows are global and are never deleted.
 */
export const TENANT_DELETE_STEPS: readonly TenantDeleteStep[] = [
  {
    label: "document_versions",
    sql: `DELETE FROM "DocumentVersion" WHERE "documentId" IN (SELECT id FROM "Document" WHERE "tenantId" = $1)`,
  },
  {
    label: "ticket_replies",
    sql: `DELETE FROM "TicketReply" WHERE "ticketId" IN (SELECT id FROM "HelpdeskTicket" WHERE "tenantId" = $1)`,
  },
  {
    label: "commissions",
    sql: `DELETE FROM "Commission" WHERE "partnerId" IN (SELECT id FROM "ChannelPartner" WHERE "tenantId" = $1)`,
  },
  {
    label: "maintenance_logs",
    sql: `DELETE FROM "MaintenanceLog" WHERE "assetId" IN (SELECT id FROM "Asset" WHERE "tenantId" = $1)`,
  },
  {
    label: "gateway_refunds",
    sql: `DELETE FROM "GatewayRefund" WHERE "tenantId" = $1`,
  },
  {
    label: "gateway_payments",
    sql: `DELETE FROM "GatewayPayment" WHERE "tenantId" = $1`,
  },
  {
    label: "gateway_webhook_events",
    sql: `DELETE FROM "GatewayWebhookEvent" WHERE "tenantId" = $1`,
  },
  {
    label: "payments",
    sql: `DELETE FROM "Payment" WHERE "bookingId" IN (
      SELECT b.id FROM "Booking" b
      LEFT JOIN "Customer" c ON c.id = b."customerId"
      LEFT JOIN "Lead" l ON l.id = b."leadId"
      WHERE c."tenantId" = $1 OR l."tenantId" = $1
    )`,
  },
  {
    label: "receipts",
    sql: `DELETE FROM "Receipt" WHERE "bookingId" IN (
      SELECT b.id FROM "Booking" b
      LEFT JOIN "Customer" c ON c.id = b."customerId"
      LEFT JOIN "Lead" l ON l.id = b."leadId"
      WHERE c."tenantId" = $1 OR l."tenantId" = $1
    )`,
  },
  {
    label: "agreements",
    sql: `DELETE FROM "Agreement" WHERE "bookingId" IN (
      SELECT b.id FROM "Booking" b
      LEFT JOIN "Customer" c ON c.id = b."customerId"
      LEFT JOIN "Lead" l ON l.id = b."leadId"
      WHERE c."tenantId" = $1 OR l."tenantId" = $1
    )`,
  },
  {
    label: "complaints",
    sql: `DELETE FROM "Complaint" WHERE "customerId" IN (SELECT id FROM "Customer" WHERE "tenantId" = $1)`,
  },
  {
    label: "support_tickets",
    sql: `DELETE FROM "SupportTicket" WHERE "customerId" IN (SELECT id FROM "Customer" WHERE "tenantId" = $1)`,
  },
  {
    label: "bookings",
    sql: `DELETE FROM "Booking" WHERE id IN (
      SELECT b.id FROM "Booking" b
      LEFT JOIN "Customer" c ON c.id = b."customerId"
      LEFT JOIN "Lead" l ON l.id = b."leadId"
      WHERE c."tenantId" = $1 OR l."tenantId" = $1
    )`,
  },
  {
    label: "follow_ups",
    sql: `DELETE FROM "FollowUp" WHERE "leadId" IN (SELECT id FROM "Lead" WHERE "tenantId" = $1)`,
  },
  {
    label: "call_logs",
    sql: `DELETE FROM "CallLog" WHERE "leadId" IN (SELECT id FROM "Lead" WHERE "tenantId" = $1)`,
  },
  {
    label: "ypsr_reports",
    sql: `DELETE FROM "YpsrReport" WHERE "projectId" IN (
      SELECT p.id FROM "Project" p
      INNER JOIN "Company" co ON co.id = p."companyId"
      WHERE co."tenantId" = $1
    ) OR "siteVisitId" IN (
      SELECT sv.id FROM "SiteVisit" sv
      WHERE sv."leadId" IN (SELECT id FROM "Lead" WHERE "tenantId" = $1)
    )`,
  },
  {
    label: "site_visits",
    sql: `DELETE FROM "SiteVisit" WHERE "leadId" IN (SELECT id FROM "Lead" WHERE "tenantId" = $1)
       OR "projectId" IN (
         SELECT p.id FROM "Project" p
         INNER JOIN "Company" co ON co.id = p."companyId"
         WHERE co."tenantId" = $1
       )`,
  },
  {
    label: "meetings",
    sql: `DELETE FROM "Meeting" WHERE "leadId" IN (SELECT id FROM "Lead" WHERE "tenantId" = $1)`,
  },
  {
    label: "activities",
    sql: `DELETE FROM "Activity" WHERE "userId" IN (SELECT id FROM "User" WHERE "tenantId" = $1)
       OR "leadId" IN (SELECT id FROM "Lead" WHERE "tenantId" = $1)`,
  },
  {
    label: "goods_receipts",
    sql: `DELETE FROM "GoodsReceiptNote" WHERE "poId" IN (
      SELECT po.id FROM "PurchaseOrder" po
      WHERE po."vendorId" IN (SELECT id FROM "Vendor" WHERE "tenantId" = $1)
         OR po."projectId" IN (
           SELECT p.id FROM "Project" p
           INNER JOIN "Company" co ON co.id = p."companyId"
           WHERE co."tenantId" = $1
         )
    )`,
  },
  {
    label: "purchase_orders",
    sql: `DELETE FROM "PurchaseOrder" WHERE "vendorId" IN (SELECT id FROM "Vendor" WHERE "tenantId" = $1)
       OR "projectId" IN (
         SELECT p.id FROM "Project" p
         INNER JOIN "Company" co ON co.id = p."companyId"
         WHERE co."tenantId" = $1
       )`,
  },
  {
    label: "purchase_requisitions",
    sql: `DELETE FROM "PurchaseRequisition" WHERE "projectId" IN (
      SELECT p.id FROM "Project" p
      INNER JOIN "Company" co ON co.id = p."companyId"
      WHERE co."tenantId" = $1
    )`,
  },
  {
    label: "vendor_payments",
    sql: `DELETE FROM "VendorPayment" WHERE "vendorId" IN (SELECT id FROM "Vendor" WHERE "tenantId" = $1)`,
  },
  {
    label: "vendor_contracts",
    sql: `DELETE FROM "VendorContract" WHERE "vendorId" IN (SELECT id FROM "Vendor" WHERE "tenantId" = $1)
       OR "projectId" IN (
         SELECT p.id FROM "Project" p
         INNER JOIN "Company" co ON co.id = p."companyId"
         WHERE co."tenantId" = $1
       )`,
  },
  {
    label: "inventory_items",
    sql: `DELETE FROM "InventoryItem" WHERE "projectId" IN (
      SELECT p.id FROM "Project" p
      INNER JOIN "Company" co ON co.id = p."companyId"
      WHERE co."tenantId" = $1
    )`,
  },
  {
    label: "budgets",
    sql: `DELETE FROM "Budget" WHERE "projectId" IN (
      SELECT p.id FROM "Project" p
      INNER JOIN "Company" co ON co.id = p."companyId"
      WHERE co."tenantId" = $1
    )`,
  },
  {
    label: "boqs",
    sql: `DELETE FROM "BOQ" WHERE "projectId" IN (
      SELECT p.id FROM "Project" p
      INNER JOIN "Company" co ON co.id = p."companyId"
      WHERE co."tenantId" = $1
    )`,
  },
  {
    label: "quality_checks",
    sql: `DELETE FROM "QualityCheck" WHERE "projectId" IN (
      SELECT p.id FROM "Project" p
      INNER JOIN "Company" co ON co.id = p."companyId"
      WHERE co."tenantId" = $1
    )`,
  },
  {
    label: "daily_progress",
    sql: `DELETE FROM "DailyProgressReport" WHERE "projectId" IN (
      SELECT p.id FROM "Project" p
      INNER JOIN "Company" co ON co.id = p."companyId"
      WHERE co."tenantId" = $1
    )`,
  },
  {
    label: "milestones",
    sql: `DELETE FROM "Milestone" WHERE "projectId" IN (
      SELECT p.id FROM "Project" p
      INNER JOIN "Company" co ON co.id = p."companyId"
      WHERE co."tenantId" = $1
    )`,
  },
  {
    label: "payment_plans",
    sql: `DELETE FROM "PaymentPlan" WHERE "projectId" IN (
      SELECT p.id FROM "Project" p
      INNER JOIN "Company" co ON co.id = p."companyId"
      WHERE co."tenantId" = $1
    )`,
  },
  {
    label: "units",
    sql: `DELETE FROM "Unit" WHERE "projectId" IN (
      SELECT p.id FROM "Project" p
      INNER JOIN "Company" co ON co.id = p."companyId"
      WHERE co."tenantId" = $1
    )`,
  },
  {
    label: "towers",
    sql: `DELETE FROM "Tower" WHERE "projectId" IN (
      SELECT p.id FROM "Project" p
      INNER JOIN "Company" co ON co.id = p."companyId"
      WHERE co."tenantId" = $1
    )`,
  },
  {
    label: "buildings",
    sql: `DELETE FROM "Building" WHERE "projectId" IN (
      SELECT p.id FROM "Project" p
      INNER JOIN "Company" co ON co.id = p."companyId"
      WHERE co."tenantId" = $1
    )`,
  },
  {
    label: "lms_goals",
    sql: `DELETE FROM "LmsGoal" WHERE "tenantId" = $1`,
  },
  {
    label: "clash_leads",
    sql: `DELETE FROM "ClashLead" WHERE "tenantId" = $1`,
  },
  {
    label: "appointments",
    sql: `DELETE FROM "Appointment" WHERE "tenantId" = $1`,
  },
  {
    label: "leads",
    sql: `DELETE FROM "Lead" WHERE "tenantId" = $1`,
  },
  {
    label: "projects",
    sql: `DELETE FROM "Project" WHERE "companyId" IN (SELECT id FROM "Company" WHERE "tenantId" = $1)`,
  },
  {
    label: "attendance",
    sql: `DELETE FROM "Attendance" WHERE "employeeId" IN (
      SELECT e.id FROM "Employee" e
      INNER JOIN "Company" co ON co.id = e."companyId"
      WHERE co."tenantId" = $1
    )`,
  },
  {
    label: "leaves",
    sql: `DELETE FROM "Leave" WHERE "employeeId" IN (
      SELECT e.id FROM "Employee" e
      INNER JOIN "Company" co ON co.id = e."companyId"
      WHERE co."tenantId" = $1
    )`,
  },
  {
    label: "payslips",
    sql: `DELETE FROM "Payslip" WHERE "employeeId" IN (
      SELECT e.id FROM "Employee" e
      INNER JOIN "Company" co ON co.id = e."companyId"
      WHERE co."tenantId" = $1
    )`,
  },
  {
    label: "expenses",
    sql: `DELETE FROM "Expense" WHERE "employeeId" IN (
      SELECT e.id FROM "Employee" e
      INNER JOIN "Company" co ON co.id = e."companyId"
      WHERE co."tenantId" = $1
    )`,
  },
  {
    label: "unlink_user_employee",
    sql: `UPDATE "User" SET "employeeId" = NULL WHERE "tenantId" = $1`,
  },
  {
    label: "employees",
    sql: `DELETE FROM "Employee" WHERE "companyId" IN (SELECT id FROM "Company" WHERE "tenantId" = $1)`,
  },
  {
    label: "branches",
    sql: `DELETE FROM "Branch" WHERE "companyId" IN (SELECT id FROM "Company" WHERE "tenantId" = $1)`,
  },
  {
    label: "sessions",
    sql: `DELETE FROM "Session" WHERE "userId" IN (SELECT id FROM "User" WHERE "tenantId" = $1)`,
  },
  {
    label: "notifications",
    sql: `DELETE FROM "Notification" WHERE "userId" IN (SELECT id FROM "User" WHERE "tenantId" = $1)`,
  },
  {
    label: "user_roles",
    sql: `DELETE FROM "UserRole" WHERE "userId" IN (SELECT id FROM "User" WHERE "tenantId" = $1)
       OR "roleId" IN (SELECT id FROM "Role" WHERE "tenantId" = $1)`,
  },
  {
    label: "role_permissions",
    sql: `DELETE FROM "RolePermission" WHERE "roleId" IN (SELECT id FROM "Role" WHERE "tenantId" = $1)`,
  },
  {
    label: "tab_login_configs",
    sql: `DELETE FROM "TabLoginConfig" WHERE "tenantId" = $1`,
  },
  {
    label: "helpdesk_tickets",
    sql: `DELETE FROM "HelpdeskTicket" WHERE "tenantId" = $1`,
  },
  {
    label: "da_reports",
    sql: `DELETE FROM "DaReport" WHERE "tenantId" = $1`,
  },
  {
    label: "documents",
    sql: `DELETE FROM "Document" WHERE "tenantId" = $1`,
  },
  {
    label: "campaigns",
    sql: `DELETE FROM "Campaign" WHERE "tenantId" = $1`,
  },
  {
    label: "channel_partners",
    sql: `DELETE FROM "ChannelPartner" WHERE "tenantId" = $1`,
  },
  {
    label: "legal_cases",
    sql: `DELETE FROM "LegalCase" WHERE "tenantId" = $1`,
  },
  {
    label: "assets",
    sql: `DELETE FROM "Asset" WHERE "tenantId" = $1`,
  },
  {
    label: "ledger_entries",
    sql: `DELETE FROM "LedgerEntry" WHERE "tenantId" = $1`,
  },
  {
    label: "gst_invoices",
    sql: `DELETE FROM "GSTInvoice" WHERE "tenantId" = $1`,
  },
  {
    label: "vendors",
    sql: `DELETE FROM "Vendor" WHERE "tenantId" = $1`,
  },
  {
    label: "customers",
    sql: `DELETE FROM "Customer" WHERE "tenantId" = $1`,
  },
  {
    label: "subscriptions",
    sql: `DELETE FROM "Subscription" WHERE "tenantId" = $1`,
  },
  {
    label: "tenant_limits",
    sql: `DELETE FROM "TenantLimits" WHERE "tenantId" = $1`,
  },
  {
    label: "companies",
    sql: `DELETE FROM "Company" WHERE "tenantId" = $1`,
  },
  {
    label: "roles",
    sql: `DELETE FROM "Role" WHERE "tenantId" = $1`,
  },
  {
    label: "users",
    sql: `DELETE FROM "User" WHERE "tenantId" = $1`,
  },
  {
    label: "audit_logs",
    sql: `DELETE FROM "AuditLog" WHERE "tenantId" = $1`,
  },
  {
    label: "tenant",
    sql: `DELETE FROM "Tenant" WHERE id = $1`,
  },
] as const;

export function tenantDeleteLabels(): string[] {
  return TENANT_DELETE_STEPS.map((s) => s.label);
}
