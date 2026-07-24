import {
  DEFAULT_PRISMA_CONNECTION_LIMIT,
  DEFAULT_PRISMA_POOL_TIMEOUT_SEC,
  redactDatabaseUrl,
  resolveDatabaseUrl,
} from "./prisma-pool";

describe("resolveDatabaseUrl", () => {
  const base = "postgresql://propos:secret@localhost:5432/propos";

  it("injects default connection_limit and pool_timeout", () => {
    const resolved = resolveDatabaseUrl({ DATABASE_URL: base });
    const u = new URL(resolved);
    expect(u.searchParams.get("connection_limit")).toBe(
      String(DEFAULT_PRISMA_CONNECTION_LIMIT),
    );
    expect(u.searchParams.get("pool_timeout")).toBe(
      String(DEFAULT_PRISMA_POOL_TIMEOUT_SEC),
    );
    expect(u.password).toBe("secret");
  });

  it("respects explicit URL params and env overrides", () => {
    const resolved = resolveDatabaseUrl({
      DATABASE_URL: `${base}?connection_limit=5`,
      PRISMA_POOL_TIMEOUT: "30",
    });
    const u = new URL(resolved);
    expect(u.searchParams.get("connection_limit")).toBe("5");
    expect(u.searchParams.get("pool_timeout")).toBe("30");
  });

  it("sets pgbouncer=true when PGBOUNCER=true", () => {
    const resolved = resolveDatabaseUrl({
      DATABASE_URL: base,
      PGBOUNCER: "true",
    });
    expect(new URL(resolved).searchParams.get("pgbouncer")).toBe("true");
  });

  it("throws when DATABASE_URL missing", () => {
    expect(() => resolveDatabaseUrl({})).toThrow(/DATABASE_URL/);
  });
});

describe("redactDatabaseUrl", () => {
  it("masks password", () => {
    expect(redactDatabaseUrl("postgresql://u:pass@h/db")).toContain("***");
    expect(redactDatabaseUrl("postgresql://u:pass@h/db")).not.toContain("pass");
  });
});
