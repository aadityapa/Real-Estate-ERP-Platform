-- Prompt 6.2: RERA disclosure + payment stages, agreement templates, e-sign.
-- Apply with:
--   pnpm --filter @propos/backend exec prisma migrate deploy
-- (migrate may fail if DATABASE_URL / Postgres is unreachable — e.g. localhost:51218.)

DO $$ BEGIN
  CREATE TYPE "ESignProvider" AS ENUM ('MOCK', 'DIGIO', 'LEEGALITY', 'DOCUSIGN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ESignStatus" AS ENUM ('PENDING', 'SENT', 'VIEWED', 'SIGNED', 'DECLINED', 'EXPIRED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "documentId" TEXT;
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "templateId" TEXT;
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS "ReraProjectProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "reraNumber" TEXT NOT NULL,
    "registrationDate" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "promoterName" TEXT,
    "totalCarpetAreaSqm" DECIMAL(65,30),
    "openParkingCount" INTEGER,
    "coveredParkingCount" INTEGER,
    "disclosures" JSONB,
    "projectWebsiteUrl" TEXT,
    "lastDisclosureAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReraProjectProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReraProjectProfile_projectId_key" ON "ReraProjectProfile"("projectId");
CREATE INDEX IF NOT EXISTS "ReraProjectProfile_tenantId_idx" ON "ReraProjectProfile"("tenantId");
CREATE INDEX IF NOT EXISTS "ReraProjectProfile_tenantId_reraNumber_idx" ON "ReraProjectProfile"("tenantId", "reraNumber");

ALTER TABLE "ReraProjectProfile" DROP CONSTRAINT IF EXISTS "ReraProjectProfile_tenantId_fkey";
ALTER TABLE "ReraProjectProfile" ADD CONSTRAINT "ReraProjectProfile_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReraProjectProfile" DROP CONSTRAINT IF EXISTS "ReraProjectProfile_projectId_fkey";
ALTER TABLE "ReraProjectProfile" ADD CONSTRAINT "ReraProjectProfile_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ReraPaymentStage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxCumulativePctBps" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "linkedMilestoneName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReraPaymentStage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReraPaymentStage_projectId_code_key" ON "ReraPaymentStage"("projectId", "code");
CREATE INDEX IF NOT EXISTS "ReraPaymentStage_tenantId_idx" ON "ReraPaymentStage"("tenantId");
CREATE INDEX IF NOT EXISTS "ReraPaymentStage_tenantId_projectId_idx" ON "ReraPaymentStage"("tenantId", "projectId");

ALTER TABLE "ReraPaymentStage" DROP CONSTRAINT IF EXISTS "ReraPaymentStage_tenantId_fkey";
ALTER TABLE "ReraPaymentStage" ADD CONSTRAINT "ReraPaymentStage_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReraPaymentStage" DROP CONSTRAINT IF EXISTS "ReraPaymentStage_projectId_fkey";
ALTER TABLE "ReraPaymentStage" ADD CONSTRAINT "ReraPaymentStage_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "AgreementTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AgreementType" NOT NULL,
    "bodyText" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AgreementTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AgreementTemplate_tenantId_idx" ON "AgreementTemplate"("tenantId");
CREATE INDEX IF NOT EXISTS "AgreementTemplate_tenantId_type_isActive_idx" ON "AgreementTemplate"("tenantId", "type", "isActive");

ALTER TABLE "AgreementTemplate" DROP CONSTRAINT IF EXISTS "AgreementTemplate_tenantId_fkey";
ALTER TABLE "AgreementTemplate" ADD CONSTRAINT "AgreementTemplate_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ESignRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "agreementId" TEXT,
    "provider" "ESignProvider" NOT NULL DEFAULT 'MOCK',
    "providerRequestId" TEXT NOT NULL,
    "status" "ESignStatus" NOT NULL DEFAULT 'PENDING',
    "signUrl" TEXT,
    "signedFileUrl" TEXT,
    "signerName" TEXT,
    "signerEmail" TEXT,
    "completedAt" TIMESTAMP(3),
    "lastWebhookAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ESignRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ESignRequest_providerRequestId_key" ON "ESignRequest"("providerRequestId");
CREATE INDEX IF NOT EXISTS "ESignRequest_tenantId_idx" ON "ESignRequest"("tenantId");
CREATE INDEX IF NOT EXISTS "ESignRequest_tenantId_status_idx" ON "ESignRequest"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "ESignRequest_documentId_idx" ON "ESignRequest"("documentId");
CREATE INDEX IF NOT EXISTS "ESignRequest_agreementId_idx" ON "ESignRequest"("agreementId");

ALTER TABLE "ESignRequest" DROP CONSTRAINT IF EXISTS "ESignRequest_tenantId_fkey";
ALTER TABLE "ESignRequest" ADD CONSTRAINT "ESignRequest_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ESignRequest" DROP CONSTRAINT IF EXISTS "ESignRequest_documentId_fkey";
ALTER TABLE "ESignRequest" ADD CONSTRAINT "ESignRequest_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ESignRequest" DROP CONSTRAINT IF EXISTS "ESignRequest_agreementId_fkey";
ALTER TABLE "ESignRequest" ADD CONSTRAINT "ESignRequest_agreementId_fkey"
  FOREIGN KEY ("agreementId") REFERENCES "Agreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Agreement_documentId_idx" ON "Agreement"("documentId");
CREATE INDEX IF NOT EXISTS "Agreement_templateId_idx" ON "Agreement"("templateId");

ALTER TABLE "Agreement" DROP CONSTRAINT IF EXISTS "Agreement_documentId_fkey";
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Agreement" DROP CONSTRAINT IF EXISTS "Agreement_templateId_fkey";
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "AgreementTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
