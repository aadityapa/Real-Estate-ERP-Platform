-- Extend Session for refresh-token rotation + reuse detection (session families).

-- Backfill familyId for any existing rows (each session becomes its own family).
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "familyId" TEXT;
UPDATE "Session" SET "familyId" = "id" WHERE "familyId" IS NULL OR "familyId" = '';
ALTER TABLE "Session" ALTER COLUMN "familyId" SET NOT NULL;

ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "revokedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE INDEX IF NOT EXISTS "Session_familyId_idx" ON "Session"("familyId");
