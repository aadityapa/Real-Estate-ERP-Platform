-- Prompt 3.2: per-tenant limit overrides (rate, seats, storage, queue concurrency).
-- Apply with: pnpm --filter @propos/backend exec prisma migrate deploy
-- (migrate dev may fail if DATABASE_URL / Postgres is unreachable.)

CREATE TABLE IF NOT EXISTS "TenantLimits" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "apiRateLimitRpm" INTEGER,
    "maxSeats" INTEGER,
    "maxStorageBytes" BIGINT,
    "queueConcurrency" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TenantLimits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TenantLimits_tenantId_key" ON "TenantLimits"("tenantId");
CREATE INDEX IF NOT EXISTS "TenantLimits_tenantId_idx" ON "TenantLimits"("tenantId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'TenantLimits_tenantId_fkey'
  ) THEN
    ALTER TABLE "TenantLimits"
      ADD CONSTRAINT "TenantLimits_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
