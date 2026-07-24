import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";
import { piiEncryptionExtension } from "./pii-prisma.extension";
import { createTenantScopeExtension } from "./tenant-prisma.extension";
import { redactDatabaseUrl, resolveDatabaseUrl } from "./prisma-pool";

/** Log Prisma queries slower than this (ms) outside production. */
const SLOW_QUERY_MS = Number.parseInt(
  process.env["PRISMA_SLOW_QUERY_MS"] ?? "200",
  10,
);

/**
 * Compose order: PII first, tenant second so query path is
 * tenant-scope → pii-encryption → engine (tenant injects, then PII encrypts).
 */
function createExtendedClient() {
  const isProd = process.env["NODE_ENV"] === "production";
  const datasourceUrl = resolveDatabaseUrl(process.env);

  const log: Prisma.LogDefinition[] = [
    { emit: "stdout", level: "warn" },
    { emit: "stdout", level: "error" },
  ];
  if (!isProd) {
    log.push({ emit: "event", level: "query" });
  }

  const base = new PrismaClient({
    datasources: { db: { url: datasourceUrl } },
    log,
  });

  if (!isProd) {
    const threshold =
      Number.isFinite(SLOW_QUERY_MS) && SLOW_QUERY_MS > 0 ? SLOW_QUERY_MS : 200;
    base.$on("query", (e: Prisma.QueryEvent) => {
      if (e.duration < threshold) return;
      // Never log params (may contain PII). Duration + truncated SQL only.
      const sql =
        e.query.length > 240 ? `${e.query.slice(0, 240)}…` : e.query;
      Logger.warn(
        `slow query ${e.duration}ms: ${sql}`,
        "PrismaService",
      );
    });
  }

  const qs = redactDatabaseUrl(datasourceUrl).split("?")[1] ?? "";
  Logger.log(`Prisma pool params: ?${qs}`, "PrismaService");

  return base
    .$extends(piiEncryptionExtension)
    .$extends(createTenantScopeExtension());
}

type ExtendedClient = ReturnType<typeof createExtendedClient>;

/**
 * Prisma client with:
 * - Transparent PII encrypt/decrypt (Customer.pan/aadhaar, bankDetails)
 * - Structural tenant scoping via TenantContext ALS (Phase 3.1)
 * - Sane connection_limit / pool_timeout (Phase 7.1)
 * - Slow-query event logging in non-prod (Phase 7.1)
 *
 * Constructor returns a Proxy so existing `prisma.model` calls hit the
 * extended client (including interactive transactions).
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly client: ExtendedClient;

  constructor() {
    this.client = createExtendedClient();
    const target = this;
    // eslint-disable-next-line no-constructor-return -- Nest-compatible extended Prisma proxy
    return new Proxy(this, {
      get(obj, prop, receiver) {
        if (prop === "onModuleInit" || prop === "onModuleDestroy") {
          return Reflect.get(obj, prop, receiver);
        }
        if (prop === "logger" || prop === "client") {
          return Reflect.get(obj, prop, receiver);
        }
        const value = Reflect.get(target.client as object, prop);
        if (typeof value === "function") {
          return (value as (...a: unknown[]) => unknown).bind(target.client);
        }
        return value;
      },
    }) as unknown as PrismaService;
  }

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
    this.logger.log("Database connected");
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}

export interface PrismaService extends ExtendedClient {}
