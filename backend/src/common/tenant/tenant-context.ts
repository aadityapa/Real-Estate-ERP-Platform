import { Injectable } from "@nestjs/common";
import { AsyncLocalStorage } from "async_hooks";

export interface TenantStore {
  /** Active tenant from JWT (request path). */
  tenantId?: string;
  /**
   * When true, Prisma tenant extension skips injection (auth bootstrap,
   * seeds, migrations helpers, system jobs).
   */
  bypass?: boolean;
}

const tenantAls = new AsyncLocalStorage<TenantStore>();

/** Low-level ALS accessors used by the Prisma extension (no Nest DI). */
export function getTenantStore(): TenantStore | undefined {
  return tenantAls.getStore();
}

export function runWithTenantStore<T>(store: TenantStore, fn: () => T): T {
  return tenantAls.run(store, fn);
}

/**
 * Request-scoped tenant identity available via DI.
 * Backed by AsyncLocalStorage so the singleton Prisma client can read it.
 */
@Injectable()
export class TenantContext {
  getTenantId(): string | undefined {
    return getTenantStore()?.tenantId;
  }

  isBypassed(): boolean {
    return getTenantStore()?.bypass === true;
  }

  /** Run `fn` with an explicit tenant (tests, background jobs). */
  runWithTenant<T>(tenantId: string, fn: () => T): T {
    return runWithTenantStore({ tenantId, bypass: false }, fn);
  }

  /** Skip structural tenant injection (auth, seed, admin system tasks). */
  runAsSystem<T>(fn: () => T): T {
    return runWithTenantStore({ bypass: true }, fn);
  }
}
