-- Prompt 6.1: GST e-invoicing (IRN/QR) + TDS. Amounts as BIGINT paise.
-- Apply with:
--   pnpm --filter @propos/backend exec prisma migrate deploy
-- (migrate may fail if DATABASE_URL / Postgres is unreachable — e.g. localhost:51218.)

-- Company.stateCode for place-of-supply
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "stateCode" TEXT;

DO $$ BEGIN
  CREATE TYPE "EInvoiceStatus" AS ENUM ('NOT_APPLICABLE', 'PENDING', 'GENERATED', 'CANCELLED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TdsStatus" AS ENUM ('ACCRUED', 'DEPOSITED', 'REPORTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Rebuild GSTInvoice for paise + IRN (legacy Decimal shape; seed does not populate rows).
DROP TABLE IF EXISTS "TdsEntry";
DROP TABLE IF EXISTS "GSTInvoice";

CREATE TABLE "GSTInvoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "type" "InvoiceType" NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "items" JSONB NOT NULL,
    "supplierGstin" TEXT NOT NULL,
    "supplierStateCode" TEXT NOT NULL,
    "buyerGstin" TEXT,
    "buyerStateCode" TEXT NOT NULL,
    "buyerName" TEXT,
    "placeOfSupply" TEXT NOT NULL,
    "customerId" TEXT,
    "vendorId" TEXT,
    "saasInvoiceId" TEXT,
    "receiptId" TEXT,
    "taxablePaise" BIGINT NOT NULL,
    "cgstPaise" BIGINT NOT NULL DEFAULT 0,
    "sgstPaise" BIGINT NOT NULL DEFAULT 0,
    "igstPaise" BIGINT NOT NULL DEFAULT 0,
    "totalGstPaise" BIGINT NOT NULL,
    "totalPaise" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "fiscalYear" TEXT NOT NULL,
    "seriesPrefix" TEXT NOT NULL DEFAULT 'INV',
    "irn" TEXT,
    "irnAckNo" TEXT,
    "irnAckDate" TIMESTAMP(3),
    "signedQr" TEXT,
    "eInvoiceStatus" "EInvoiceStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "eInvoiceProvider" TEXT,
    "eInvoiceError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GSTInvoice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GSTInvoice_irn_key" ON "GSTInvoice"("irn");
CREATE UNIQUE INDEX "GSTInvoice_saasInvoiceId_key" ON "GSTInvoice"("saasInvoiceId");
CREATE UNIQUE INDEX "GSTInvoice_tenantId_invoiceNumber_key" ON "GSTInvoice"("tenantId", "invoiceNumber");
CREATE INDEX "GSTInvoice_tenantId_idx" ON "GSTInvoice"("tenantId");
CREATE INDEX "GSTInvoice_tenantId_status_idx" ON "GSTInvoice"("tenantId", "status");
CREATE INDEX "GSTInvoice_tenantId_fiscalYear_idx" ON "GSTInvoice"("tenantId", "fiscalYear");
CREATE INDEX "GSTInvoice_tenantId_invoiceDate_idx" ON "GSTInvoice"("tenantId", "invoiceDate");
CREATE INDEX "GSTInvoice_eInvoiceStatus_idx" ON "GSTInvoice"("eInvoiceStatus");
CREATE INDEX "GSTInvoice_createdAt_idx" ON "GSTInvoice"("createdAt");

ALTER TABLE "GSTInvoice" ADD CONSTRAINT "GSTInvoice_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GSTInvoice" ADD CONSTRAINT "GSTInvoice_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GSTInvoice" ADD CONSTRAINT "GSTInvoice_saasInvoiceId_fkey"
  FOREIGN KEY ("saasInvoiceId") REFERENCES "SaasInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "TdsEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "deducteeType" TEXT NOT NULL,
    "deducteeName" TEXT NOT NULL,
    "deducteePanLast4" TEXT,
    "vendorId" TEXT,
    "customerId" TEXT,
    "vendorPaymentId" TEXT,
    "paymentId" TEXT,
    "gstInvoiceId" TEXT,
    "paymentAmountPaise" BIGINT NOT NULL,
    "tdsRateBps" INTEGER NOT NULL,
    "tdsAmountPaise" BIGINT NOT NULL,
    "netPayablePaise" BIGINT NOT NULL,
    "deductDate" TIMESTAMP(3) NOT NULL,
    "challanNumber" TEXT,
    "challanDate" TIMESTAMP(3),
    "quarter" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "status" "TdsStatus" NOT NULL DEFAULT 'ACCRUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TdsEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TdsEntry_tenantId_idx" ON "TdsEntry"("tenantId");
CREATE INDEX "TdsEntry_tenantId_fiscalYear_quarter_idx" ON "TdsEntry"("tenantId", "fiscalYear", "quarter");
CREATE INDEX "TdsEntry_tenantId_section_idx" ON "TdsEntry"("tenantId", "section");
CREATE INDEX "TdsEntry_tenantId_status_idx" ON "TdsEntry"("tenantId", "status");
CREATE INDEX "TdsEntry_createdAt_idx" ON "TdsEntry"("createdAt");

ALTER TABLE "TdsEntry" ADD CONSTRAINT "TdsEntry_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TdsEntry" ADD CONSTRAINT "TdsEntry_gstInvoiceId_fkey"
  FOREIGN KEY ("gstInvoiceId") REFERENCES "GSTInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
