-- Prompt 5.1: Razorpay gateway orders, refunds, webhook idempotency.
-- Amounts stored as BIGINT paise. Apply with:
--   pnpm --filter @propos/backend exec prisma migrate deploy
-- (migrate dev may fail if DATABASE_URL / Postgres is unreachable.)

-- AlterEnum PaymentMode + ONLINE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'PaymentMode' AND e.enumlabel = 'ONLINE'
  ) THEN
    ALTER TYPE "PaymentMode" ADD VALUE 'ONLINE';
  END IF;
END $$;

DO $$ BEGIN
  CREATE TYPE "GatewayProvider" AS ENUM ('RAZORPAY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GatewayPaymentStatus" AS ENUM (
    'CREATED', 'ATTEMPTED', 'CAPTURED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GatewayRefundStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GatewayWebhookStatus" AS ENUM ('PROCESSED', 'DUPLICATE', 'IGNORED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "GatewayPayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "provider" "GatewayProvider" NOT NULL DEFAULT 'RAZORPAY',
    "amountPaise" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "GatewayPaymentStatus" NOT NULL DEFAULT 'CREATED',
    "providerOrderId" TEXT NOT NULL,
    "providerPaymentId" TEXT,
    "receiptId" TEXT,
    "ledgerEntryId" TEXT,
    "notes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GatewayPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GatewayPayment_providerOrderId_key" ON "GatewayPayment"("providerOrderId");
CREATE UNIQUE INDEX IF NOT EXISTS "GatewayPayment_providerPaymentId_key" ON "GatewayPayment"("providerPaymentId");
CREATE INDEX IF NOT EXISTS "GatewayPayment_tenantId_idx" ON "GatewayPayment"("tenantId");
CREATE INDEX IF NOT EXISTS "GatewayPayment_tenantId_status_idx" ON "GatewayPayment"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "GatewayPayment_bookingId_idx" ON "GatewayPayment"("bookingId");
CREATE INDEX IF NOT EXISTS "GatewayPayment_paymentId_idx" ON "GatewayPayment"("paymentId");
CREATE INDEX IF NOT EXISTS "GatewayPayment_createdAt_idx" ON "GatewayPayment"("createdAt");

CREATE TABLE IF NOT EXISTS "GatewayRefund" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "gatewayPaymentId" TEXT NOT NULL,
    "amountPaise" BIGINT NOT NULL,
    "providerRefundId" TEXT NOT NULL,
    "status" "GatewayRefundStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "ledgerEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GatewayRefund_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GatewayRefund_providerRefundId_key" ON "GatewayRefund"("providerRefundId");
CREATE INDEX IF NOT EXISTS "GatewayRefund_tenantId_idx" ON "GatewayRefund"("tenantId");
CREATE INDEX IF NOT EXISTS "GatewayRefund_gatewayPaymentId_idx" ON "GatewayRefund"("gatewayPaymentId");

CREATE TABLE IF NOT EXISTS "GatewayWebhookEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "provider" "GatewayProvider" NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "status" "GatewayWebhookStatus" NOT NULL DEFAULT 'PROCESSED',
    "error" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GatewayWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GatewayWebhookEvent_provider_eventId_key" ON "GatewayWebhookEvent"("provider", "eventId");
CREATE INDEX IF NOT EXISTS "GatewayWebhookEvent_tenantId_idx" ON "GatewayWebhookEvent"("tenantId");
CREATE INDEX IF NOT EXISTS "GatewayWebhookEvent_processedAt_idx" ON "GatewayWebhookEvent"("processedAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GatewayPayment_tenantId_fkey') THEN
    ALTER TABLE "GatewayPayment"
      ADD CONSTRAINT "GatewayPayment_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GatewayPayment_bookingId_fkey') THEN
    ALTER TABLE "GatewayPayment"
      ADD CONSTRAINT "GatewayPayment_bookingId_fkey"
      FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GatewayPayment_paymentId_fkey') THEN
    ALTER TABLE "GatewayPayment"
      ADD CONSTRAINT "GatewayPayment_paymentId_fkey"
      FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GatewayRefund_tenantId_fkey') THEN
    ALTER TABLE "GatewayRefund"
      ADD CONSTRAINT "GatewayRefund_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GatewayRefund_gatewayPaymentId_fkey') THEN
    ALTER TABLE "GatewayRefund"
      ADD CONSTRAINT "GatewayRefund_gatewayPaymentId_fkey"
      FOREIGN KEY ("gatewayPaymentId") REFERENCES "GatewayPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GatewayWebhookEvent_tenantId_fkey') THEN
    ALTER TABLE "GatewayWebhookEvent"
      ADD CONSTRAINT "GatewayWebhookEvent_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
