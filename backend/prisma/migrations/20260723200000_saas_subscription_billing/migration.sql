-- Prompt 5.2: SaaS subscription billing, plan entitlements, invoices (GST deferred).
-- Money as BIGINT paise. Apply with:
--   pnpm --filter @propos/backend exec prisma migrate deploy
-- (migrate may fail if DATABASE_URL / Postgres is unreachable — e.g. localhost:51218.)

-- TenantLimits: maxProjects + featureFlags
ALTER TABLE "TenantLimits" ADD COLUMN IF NOT EXISTS "maxProjects" INTEGER;
ALTER TABLE "TenantLimits" ADD COLUMN IF NOT EXISTS "featureFlags" JSONB;

-- SubStatus: add PAST_DUE / HALTED if missing (Postgres enum values are append-only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'SubStatus' AND e.enumlabel = 'PAST_DUE'
  ) THEN
    ALTER TYPE "SubStatus" ADD VALUE 'PAST_DUE';
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'SubStatus' AND e.enumlabel = 'HALTED'
  ) THEN
    ALTER TYPE "SubStatus" ADD VALUE 'HALTED';
  END IF;
END $$;

DO $$ BEGIN
  CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SaasInvoiceStatus" AS ENUM ('OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Rebuild Subscription for SaaS billing (legacy Decimal amount → BIGINT paise).
-- Safe: seed does not create Subscription rows; drop+recreate if legacy shape.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Subscription' AND column_name = 'amount'
  ) THEN
    DROP TABLE IF EXISTS "SaasInvoice";
    DROP TABLE IF EXISTS "SaaSInvoice";
    DROP TABLE IF EXISTS "Subscription";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "Subscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "plan" "PlanType" NOT NULL,
    "status" "SubStatus" NOT NULL DEFAULT 'TRIAL',
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "amountPaise" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "mrrPaise" BIGINT NOT NULL DEFAULT 0,
    "provider" "GatewayProvider" NOT NULL DEFAULT 'RAZORPAY',
    "providerSubscriptionId" TEXT,
    "providerPlanId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "dunningStatus" TEXT NOT NULL DEFAULT 'NONE',
    "dunningAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastPaymentAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_providerSubscriptionId_key"
  ON "Subscription"("providerSubscriptionId");
CREATE INDEX IF NOT EXISTS "Subscription_tenantId_idx" ON "Subscription"("tenantId");
CREATE INDEX IF NOT EXISTS "Subscription_tenantId_status_idx" ON "Subscription"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "Subscription_status_idx" ON "Subscription"("status");

DO $$ BEGIN
  ALTER TABLE "Subscription"
    ADD CONSTRAINT "Subscription_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "SaasInvoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "SaasInvoiceStatus" NOT NULL DEFAULT 'OPEN',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "providerInvoiceId" TEXT,
    "providerPaymentId" TEXT,
    "taxNote" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SaasInvoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SaasInvoice_invoiceNumber_key" ON "SaasInvoice"("invoiceNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "SaasInvoice_providerInvoiceId_key" ON "SaasInvoice"("providerInvoiceId");
CREATE INDEX IF NOT EXISTS "SaasInvoice_tenantId_idx" ON "SaasInvoice"("tenantId");
CREATE INDEX IF NOT EXISTS "SaasInvoice_subscriptionId_idx" ON "SaasInvoice"("subscriptionId");
CREATE INDEX IF NOT EXISTS "SaasInvoice_tenantId_status_idx" ON "SaasInvoice"("tenantId", "status");

DO $$ BEGIN
  ALTER TABLE "SaasInvoice"
    ADD CONSTRAINT "SaasInvoice_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "SaasInvoice"
    ADD CONSTRAINT "SaasInvoice_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
