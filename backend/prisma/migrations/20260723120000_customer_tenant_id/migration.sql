-- Add tenant scoping to Customer (P0 tenancy fix)
-- Backfill tenantId from related bookings → leads when possible.

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

UPDATE "Customer" c
SET "tenantId" = sub.tid
FROM (
  SELECT DISTINCT ON (b."customerId") b."customerId", l."tenantId" AS tid
  FROM "Booking" b
  INNER JOIN "Lead" l ON l."id" = b."leadId"
  WHERE b."customerId" IS NOT NULL
  ORDER BY b."customerId", b."createdAt" ASC
) sub
WHERE c."id" = sub."customerId"
  AND (c."tenantId" IS NULL OR c."tenantId" = '');

-- Orphans without bookings: attach to first tenant (dev/seed safety)
UPDATE "Customer"
SET "tenantId" = (SELECT "id" FROM "Tenant" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "tenantId" IS NULL OR "tenantId" = '';

ALTER TABLE "Customer" ALTER COLUMN "tenantId" SET NOT NULL;

DROP INDEX IF EXISTS "Customer_phone_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Customer_tenantId_phone_key"
  ON "Customer"("tenantId", "phone");

CREATE INDEX IF NOT EXISTS "Customer_tenantId_idx" ON "Customer"("tenantId");
CREATE INDEX IF NOT EXISTS "Customer_createdAt_idx" ON "Customer"("createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Customer_tenantId_fkey'
  ) THEN
    ALTER TABLE "Customer"
      ADD CONSTRAINT "Customer_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
