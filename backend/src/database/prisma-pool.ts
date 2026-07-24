/**
 * Prisma connection-pool URL helpers (Phase 7.1).
 * Prefer PgBouncer in front of Postgres in production; keep app-side limits low.
 */

export const DEFAULT_PRISMA_CONNECTION_LIMIT = 10;
export const DEFAULT_PRISMA_POOL_TIMEOUT_SEC = 20;

export interface PrismaPoolEnv {
  DATABASE_URL?: string;
  PRISMA_CONNECTION_LIMIT?: string;
  PRISMA_POOL_TIMEOUT?: string;
  PGBOUNCER?: string;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Ensures DATABASE_URL carries sane Prisma pool params without clobbering
 * explicit query-string values. Sets `pgbouncer=true` when PGBOUNCER=true
 * (transaction-mode pooler — disables prepared statements).
 */
export function resolveDatabaseUrl(env: PrismaPoolEnv = process.env): string {
  const raw = env.DATABASE_URL?.trim();
  if (!raw) {
    throw new Error("DATABASE_URL is required");
  }

  const url = new URL(raw);
  if (!url.searchParams.has("connection_limit")) {
    url.searchParams.set(
      "connection_limit",
      String(
        parsePositiveInt(
          env.PRISMA_CONNECTION_LIMIT,
          DEFAULT_PRISMA_CONNECTION_LIMIT,
        ),
      ),
    );
  }
  if (!url.searchParams.has("pool_timeout")) {
    url.searchParams.set(
      "pool_timeout",
      String(
        parsePositiveInt(
          env.PRISMA_POOL_TIMEOUT,
          DEFAULT_PRISMA_POOL_TIMEOUT_SEC,
        ),
      ),
    );
  }

  const pgbouncer =
    env.PGBOUNCER === "true" || url.searchParams.get("pgbouncer") === "true";
  if (pgbouncer) {
    url.searchParams.set("pgbouncer", "true");
  }

  return url.toString();
}

/** Redact password for logs / docs. */
export function redactDatabaseUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = "***";
    return u.toString();
  } catch {
    return "[invalid DATABASE_URL]";
  }
}
