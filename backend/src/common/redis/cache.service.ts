import { Injectable, Logger } from "@nestjs/common";
import { RedisService } from "./redis.service";

const DEFAULT_TTL_SEC = 45;
const STAMPEDE_LOCK_TTL_MS = 5_000;
const STAMPEDE_WAIT_MS = 50;
const STAMPEDE_MAX_WAITS = 40;

export type CacheNamespace = "crm" | "lms" | "inventory";

/**
 * Redis read-through cache with stampede protection (SET NX lock while
 * computing) and per-tenant namespace versioning for cheap invalidation.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly memory = new Map<
    string,
    { value: string; expiresAt: number }
  >();

  constructor(private readonly redis: RedisService) {}

  versionKey(tenantId: string, ns: CacheNamespace): string {
    return `tenant:${tenantId}:cache:${ns}:v`;
  }

  async getVersion(tenantId: string, ns: CacheNamespace): Promise<number> {
    const raw = await this.redis.get(this.versionKey(tenantId, ns));
    if (raw != null) return Number(raw) || 0;
    const mem = this.memory.get(this.versionKey(tenantId, ns));
    return mem ? Number(mem.value) || 0 : 0;
  }

  async invalidate(tenantId: string, ...namespaces: CacheNamespace[]): Promise<void> {
    const unique = [...new Set(namespaces)];
    await Promise.all(
      unique.map(async (ns) => {
        const key = this.versionKey(tenantId, ns);
        if (this.redis.isReady()) {
          await this.redis.incr(key);
          await this.redis.expire(key, 86_400);
        } else {
          const cur = await this.getVersion(tenantId, ns);
          this.memory.set(key, {
            value: String(cur + 1),
            expiresAt: Date.now() + 86_400_000,
          });
        }
      }),
    );
  }

  async buildKey(
    tenantId: string,
    ns: CacheNamespace,
    parts: string[],
  ): Promise<string> {
    const v = await this.getVersion(tenantId, ns);
    const safe = parts.map((p) => p || "_").join(":");
    return `tenant:${tenantId}:cache:${ns}:${v}:${safe}`;
  }

  async getOrSet<T>(
    key: string,
    producer: () => Promise<T>,
    ttlSeconds = DEFAULT_TTL_SEC,
  ): Promise<T> {
    const cached = await this.readJson<T>(key);
    if (cached !== undefined) return cached;

    const lockKey = `${key}:lock`;
    const token = `${process.pid}-${Date.now()}-${Math.random()}`;
    const acquired = await this.redis.setNxPx(
      lockKey,
      token,
      STAMPEDE_LOCK_TTL_MS,
    );

    if (!acquired) {
      for (let i = 0; i < STAMPEDE_MAX_WAITS; i++) {
        await sleep(STAMPEDE_WAIT_MS);
        const again = await this.readJson<T>(key);
        if (again !== undefined) return again;
      }
      // Lock holder failed — compute ourselves.
      return this.computeAndStore(key, producer, ttlSeconds);
    }

    try {
      return await this.computeAndStore(key, producer, ttlSeconds);
    } finally {
      await this.redis.releaseLock(lockKey, token);
    }
  }

  private async computeAndStore<T>(
    key: string,
    producer: () => Promise<T>,
    ttlSeconds: number,
  ): Promise<T> {
    const value = await producer();
    await this.writeJson(key, value, ttlSeconds);
    return value;
  }

  private async readJson<T>(key: string): Promise<T | undefined> {
    if (this.redis.isReady()) {
      const raw = await this.redis.get(key);
      if (raw == null) return undefined;
      try {
        return JSON.parse(raw) as T;
      } catch {
        this.logger.warn(`Corrupt cache payload for ${key}`);
        return undefined;
      }
    }
    const mem = this.memory.get(key);
    if (!mem || mem.expiresAt < Date.now()) {
      if (mem) this.memory.delete(key);
      return undefined;
    }
    try {
      return JSON.parse(mem.value) as T;
    } catch {
      return undefined;
    }
  }

  private async writeJson<T>(
    key: string,
    value: T,
    ttlSeconds: number,
  ): Promise<void> {
    const raw = JSON.stringify(value);
    if (this.redis.isReady()) {
      await this.redis.set(key, raw, ttlSeconds);
      return;
    }
    this.memory.set(key, {
      value: raw,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
