/**
 * Prisma test helper notes
 * ------------------------
 * Unit tests mock PrismaService (see *.spec.ts).
 *
 * Integration / e2e tests that hit a real DB should:
 * 1. Start throwaway Postgres:
 *      docker compose -f infrastructure/docker/docker-compose.yml \
 *        -f infrastructure/docker/docker-compose.local.yml up -d postgres
 * 2. Point TEST_DATABASE_URL at an empty database (not prod).
 * 3. Run: `pnpm --filter @propos/backend exec prisma db push`
 * 4. Truncate between tests via `truncateAll(prisma)` below.
 *
 * Skip integration suites when TEST_DATABASE_URL is unset.
 */

import { PrismaClient } from "@prisma/client";

export function hasTestDatabase(): boolean {
  return Boolean(process.env["TEST_DATABASE_URL"]?.trim());
}

export function createTestPrismaClient(): PrismaClient {
  const url = process.env["TEST_DATABASE_URL"];
  if (!url) {
    throw new Error("TEST_DATABASE_URL is required for integration tests");
  }
  return new PrismaClient({ datasources: { db: { url } } });
}

/** Truncate tenant-owned tables between integration tests (order matters for FKs). */
export async function truncateAll(prisma: PrismaClient): Promise<void> {
  // Prefer a single TRUNCATE CASCADE when using Postgres.
  await prisma.$executeRawUnsafe(`
    DO $$ DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
      END LOOP;
    END $$;
  `);
}
