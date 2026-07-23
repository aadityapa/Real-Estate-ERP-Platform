import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import { RedisService } from "../../common/redis/redis.service";

const FAIL_WINDOW_SECONDS = 3600;
const MAX_FAILURES_BEFORE_LOCK = 5;
const BASE_LOCK_SECONDS = 30;
const MAX_LOCK_SECONDS = 3600;

export interface LoginAttemptContext {
  email: string;
  ipAddress?: string;
}

/**
 * Per-user and per-IP failed-login counters with exponential lockout backoff.
 * Backed by Redis when available; falls back to an in-process Map for tests/dev.
 */
@Injectable()
export class LoginLockoutService {
  private readonly logger = new Logger(LoginLockoutService.name);
  private readonly memory = new Map<
    string,
    { count?: number; lockedUntil?: number; expiresAt: number }
  >();

  constructor(private readonly redis: RedisService) {}

  async assertNotLocked(ctx: LoginAttemptContext): Promise<void> {
    const email = ctx.email.toLowerCase();
    const userLockKey = this.lockKey("user", email);
    const ipLockKey = ctx.ipAddress
      ? this.lockKey("ip", ctx.ipAddress)
      : null;

    const userTtl = await this.getLockTtlSeconds(userLockKey);
    if (userTtl > 0) {
      throw this.lockoutException(userTtl);
    }
    if (ipLockKey) {
      const ipTtl = await this.getLockTtlSeconds(ipLockKey);
      if (ipTtl > 0) {
        throw this.lockoutException(ipTtl);
      }
    }
  }

  async recordFailure(ctx: LoginAttemptContext): Promise<void> {
    const email = ctx.email.toLowerCase();
    await this.bumpFailure(this.failKey("user", email), this.lockKey("user", email));
    if (ctx.ipAddress) {
      await this.bumpFailure(
        this.failKey("ip", ctx.ipAddress),
        this.lockKey("ip", ctx.ipAddress),
      );
    }
  }

  async clearFailures(ctx: LoginAttemptContext): Promise<void> {
    const email = ctx.email.toLowerCase();
    const keys = [
      this.failKey("user", email),
      this.lockKey("user", email),
    ];
    if (ctx.ipAddress) {
      keys.push(
        this.failKey("ip", ctx.ipAddress),
        this.lockKey("ip", ctx.ipAddress),
      );
    }
    await this.delKeys(...keys);
  }

  /** Exposed for tests — lock duration after `failureCount` failures. */
  lockDurationSeconds(failureCount: number): number {
    if (failureCount < MAX_FAILURES_BEFORE_LOCK) return 0;
    const exp = failureCount - MAX_FAILURES_BEFORE_LOCK;
    return Math.min(BASE_LOCK_SECONDS * 2 ** exp, MAX_LOCK_SECONDS);
  }

  private failKey(scope: "user" | "ip", id: string): string {
    return `auth:fail:${scope}:${id}`;
  }

  private lockKey(scope: "user" | "ip", id: string): string {
    return `auth:locked:${scope}:${id}`;
  }

  private lockoutException(retryAfterSeconds: number): HttpException {
    return new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: "Too many failed login attempts. Try again later.",
        retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private async bumpFailure(failKey: string, lockKey: string): Promise<void> {
    const count = await this.incrWithWindow(failKey, FAIL_WINDOW_SECONDS);
    const lockSeconds = this.lockDurationSeconds(count);
    if (lockSeconds > 0) {
      await this.setLock(lockKey, lockSeconds);
      this.logger.warn(`Login lockout engaged for ${lockKey} (${lockSeconds}s)`);
    }
  }

  private async getLockTtlSeconds(key: string): Promise<number> {
    if (this.redis.isReady()) {
      const ttl = await this.redis.ttl(key);
      return ttl > 0 ? ttl : 0;
    }
    const entry = this.memory.get(key);
    if (!entry?.lockedUntil) return 0;
    const remaining = Math.ceil((entry.lockedUntil - Date.now()) / 1000);
    if (remaining <= 0) {
      this.memory.delete(key);
      return 0;
    }
    return remaining;
  }

  private async setLock(key: string, ttlSeconds: number): Promise<void> {
    if (this.redis.isReady()) {
      await this.redis.set(key, "1", ttlSeconds);
      return;
    }
    this.memory.set(key, {
      lockedUntil: Date.now() + ttlSeconds * 1000,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  private async incrWithWindow(key: string, windowSeconds: number): Promise<number> {
    if (this.redis.isReady()) {
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, windowSeconds);
      }
      return count;
    }
    const now = Date.now();
    const existing = this.memory.get(key);
    if (!existing || existing.expiresAt < now) {
      this.memory.set(key, { count: 1, expiresAt: now + windowSeconds * 1000 });
      return 1;
    }
    const count = (existing.count ?? 0) + 1;
    existing.count = count;
    this.memory.set(key, existing);
    return count;
  }

  private async delKeys(...keys: string[]): Promise<void> {
    if (this.redis.isReady()) {
      await this.redis.del(...keys);
    }
    for (const key of keys) {
      this.memory.delete(key);
    }
  }
}
