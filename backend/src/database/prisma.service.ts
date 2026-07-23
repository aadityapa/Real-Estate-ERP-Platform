import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { piiEncryptionExtension } from "./pii-prisma.extension";
import { createTenantScopeExtension } from "./tenant-prisma.extension";

/**
 * Compose order: PII first, tenant second so query path is
 * tenant-scope → pii-encryption → engine (tenant injects, then PII encrypts).
 */
function createExtendedClient() {
  return new PrismaClient()
    .$extends(piiEncryptionExtension)
    .$extends(createTenantScopeExtension());
}

type ExtendedClient = ReturnType<typeof createExtendedClient>;

/**
 * Prisma client with:
 * - Transparent PII encrypt/decrypt (Customer.pan/aadhaar, bankDetails)
 * - Structural tenant scoping via TenantContext ALS (Phase 3.1)
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
