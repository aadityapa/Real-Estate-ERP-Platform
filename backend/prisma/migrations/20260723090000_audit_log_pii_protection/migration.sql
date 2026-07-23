-- Prompt 2.4: append-only AuditLog + document PII-at-rest columns (ciphertext in-place).
-- Apply with: pnpm --filter @propos/backend exec prisma migrate deploy
-- (migrate dev may fail if DATABASE_URL / Postgres is unreachable.)

-- CreateTable
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "beforeHash" TEXT,
    "afterHash" TEXT,
    "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AuditLog_tenantId_fkey'
  ) THEN
    ALTER TABLE "AuditLog"
      ADD CONSTRAINT "AuditLog_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_tenantId_entity_entityId_idx" ON "AuditLog"("tenantId", "entity", "entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- Append-only: block UPDATE/DELETE at the database layer.
CREATE OR REPLACE FUNCTION propos_audit_log_append_only()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_prevent_mutation ON "AuditLog";
CREATE TRIGGER audit_log_prevent_mutation
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW
  EXECUTE PROCEDURE propos_audit_log_append_only();

-- Customer.pan / Customer.aadhaar and Employee|Vendor.bankDetails remain the same
-- column types; application layer stores AES-256-GCM ciphertext (prefix enc:v1:).
-- Existing plaintext rows are accepted on read until rewritten.
