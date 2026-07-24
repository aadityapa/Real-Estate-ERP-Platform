-- Prompt 7.1: composite indexes for CRM/LMS hot paths.
-- Apply with:
--   pnpm --filter @propos/backend exec prisma migrate deploy
-- (migrate may fail if DATABASE_URL / Postgres is unreachable — e.g. localhost:51218.)

-- Lead list / dashboard / feed
CREATE INDEX IF NOT EXISTS "Lead_tenantId_isArchived_createdAt_idx" ON "Lead"("tenantId", "isArchived", "createdAt");
CREATE INDEX IF NOT EXISTS "Lead_tenantId_isArchived_status_idx" ON "Lead"("tenantId", "isArchived", "status");
CREATE INDEX IF NOT EXISTS "Lead_tenantId_isArchived_source_idx" ON "Lead"("tenantId", "isArchived", "source");
CREATE INDEX IF NOT EXISTS "Lead_tenantId_assignedToId_isArchived_idx" ON "Lead"("tenantId", "assignedToId", "isArchived");
CREATE INDEX IF NOT EXISTS "Lead_tenantId_projectId_isArchived_idx" ON "Lead"("tenantId", "projectId", "isArchived");
CREATE INDEX IF NOT EXISTS "Lead_tenantId_feedScore_createdAt_idx" ON "Lead"("tenantId", "feedScore", "createdAt");
CREATE INDEX IF NOT EXISTS "Lead_tenantId_claimedById_claimedAt_idx" ON "Lead"("tenantId", "claimedById", "claimedAt");
CREATE INDEX IF NOT EXISTS "Lead_tenantId_isArchived_updatedAt_idx" ON "Lead"("tenantId", "isArchived", "updatedAt");

-- Follow-ups / calls / site visits (CRM dashboard "today" + LMS)
CREATE INDEX IF NOT EXISTS "FollowUp_leadId_scheduledAt_idx" ON "FollowUp"("leadId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "FollowUp_status_scheduledAt_idx" ON "FollowUp"("status", "scheduledAt");
CREATE INDEX IF NOT EXISTS "CallLog_leadId_calledAt_idx" ON "CallLog"("leadId", "calledAt");
CREATE INDEX IF NOT EXISTS "SiteVisit_leadId_scheduledAt_idx" ON "SiteVisit"("leadId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "SiteVisit_status_completedAt_idx" ON "SiteVisit"("status", "completedAt");
CREATE INDEX IF NOT EXISTS "SiteVisit_attendedBy_status_completedAt_idx" ON "SiteVisit"("attendedBy", "status", "completedAt");

-- Bookings / inventory
CREATE INDEX IF NOT EXISTS "Booking_salesPersonId_createdAt_idx" ON "Booking"("salesPersonId", "createdAt");
CREATE INDEX IF NOT EXISTS "Booking_status_createdAt_idx" ON "Booking"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Unit_projectId_status_idx" ON "Unit"("projectId", "status");
