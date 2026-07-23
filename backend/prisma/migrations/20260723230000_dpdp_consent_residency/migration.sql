-- Prompt 6.3: DPDP Act 2023 — consent registry, data-subject requests, residency.
-- Apply with:
--   pnpm --filter @propos/backend exec prisma migrate deploy
-- (migrate may fail if DATABASE_URL / Postgres is unreachable — e.g. localhost:51218.)

DO $$ BEGIN
  CREATE TYPE "DataSubjectRequestType" AS ENUM ('ACCESS', 'CORRECTION', 'ERASURE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DataSubjectRequestStatus" AS ENUM ('PENDING', 'COMPLETED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "erasedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Customer_tenantId_erasedAt_idx" ON "Customer"("tenantId", "erasedAt");

CREATE TABLE IF NOT EXISTS "ConsentPurpose" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConsentPurpose_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ConsentPurpose_code_key" ON "ConsentPurpose"("code");

CREATE TABLE IF NOT EXISTS "CustomerConsent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "purposeId" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "grantedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "channel" TEXT,
    "noticeVersion" TEXT,
    "recordedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomerConsent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerConsent_tenantId_customerId_purposeId_key"
  ON "CustomerConsent"("tenantId", "customerId", "purposeId");
CREATE INDEX IF NOT EXISTS "CustomerConsent_tenantId_idx" ON "CustomerConsent"("tenantId");
CREATE INDEX IF NOT EXISTS "CustomerConsent_tenantId_customerId_idx" ON "CustomerConsent"("tenantId", "customerId");
CREATE INDEX IF NOT EXISTS "CustomerConsent_purposeId_idx" ON "CustomerConsent"("purposeId");

ALTER TABLE "CustomerConsent" DROP CONSTRAINT IF EXISTS "CustomerConsent_tenantId_fkey";
ALTER TABLE "CustomerConsent" ADD CONSTRAINT "CustomerConsent_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerConsent" DROP CONSTRAINT IF EXISTS "CustomerConsent_customerId_fkey";
ALTER TABLE "CustomerConsent" ADD CONSTRAINT "CustomerConsent_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CustomerConsent" DROP CONSTRAINT IF EXISTS "CustomerConsent_purposeId_fkey";
ALTER TABLE "CustomerConsent" ADD CONSTRAINT "CustomerConsent_purposeId_fkey"
  FOREIGN KEY ("purposeId") REFERENCES "ConsentPurpose"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "DataSubjectRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "DataSubjectRequestType" NOT NULL,
    "status" "DataSubjectRequestStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "requestedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DataSubjectRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DataSubjectRequest_tenantId_idx" ON "DataSubjectRequest"("tenantId");
CREATE INDEX IF NOT EXISTS "DataSubjectRequest_tenantId_customerId_idx" ON "DataSubjectRequest"("tenantId", "customerId");
CREATE INDEX IF NOT EXISTS "DataSubjectRequest_tenantId_type_status_idx" ON "DataSubjectRequest"("tenantId", "type", "status");

ALTER TABLE "DataSubjectRequest" DROP CONSTRAINT IF EXISTS "DataSubjectRequest_tenantId_fkey";
ALTER TABLE "DataSubjectRequest" ADD CONSTRAINT "DataSubjectRequest_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DataSubjectRequest" DROP CONSTRAINT IF EXISTS "DataSubjectRequest_customerId_fkey";
ALTER TABLE "DataSubjectRequest" ADD CONSTRAINT "DataSubjectRequest_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed purpose registry (idempotent by code).
INSERT INTO "ConsentPurpose" ("id", "code", "name", "description", "isActive", "createdAt", "updatedAt")
VALUES
  ('cp-service-delivery', 'SERVICE_DELIVERY', 'Service delivery', 'Process bookings, payments, possession, and customer support.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cp-kyc-verification', 'KYC_VERIFICATION', 'KYC / identity verification', 'Verify identity (PAN / Aadhaar last-4) for statutory compliance.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cp-marketing', 'MARKETING', 'Marketing communications', 'Send project offers and marketing messages.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cp-analytics', 'ANALYTICS', 'Product analytics', 'Improve PropOS product experience with aggregated usage signals.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cp-legal-compliance', 'LEGAL_COMPLIANCE', 'Legal & regulatory compliance', 'Retain records required by RERA, tax, and other Indian law.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cp-third-party', 'THIRD_PARTY_SHARING', 'Third-party sharing', 'Share data with banks, channel partners, or e-sign providers as needed.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- Opt-in RLS for new tenant-scoped tables (no-op until app.propos_rls=on).
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY['CustomerConsent', 'DataSubjectRequest'];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS propos_tenant_isolation ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY propos_tenant_isolation ON %I
         FOR ALL
         USING (
           NOT propos_rls_active()
           OR "tenantId" = propos_rls_tenant_id()
         )
         WITH CHECK (
           NOT propos_rls_active()
           OR "tenantId" = propos_rls_tenant_id()
         )',
      tbl
    );
  END LOOP;
END $$;
