import {
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { RedisService } from "../redis/redis.service";
import { TenantLimitsService } from "./tenant-limits.service";

export interface TenantUsageSnapshot {
  apiCallsLastMinute: number;
  apiCallsToday: number;
  seats: number;
  projects: number;
  storageBytes: number;
}

export const PLAN_LIMIT_ERROR = "PLAN_LIMIT_EXCEEDED" as const;

/**
 * Per-tenant usage counters. API call counters live in Redis; seats/projects/storage
 * are sourced from Postgres (authoritative) with optional Redis cache warm.
 */
@Injectable()
export class TenantUsageService {
  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly limits: TenantLimitsService,
  ) {}

  /** Increment rate-window + daily API counters. Returns current minute count. */
  async recordApiCall(tenantId: string): Promise<number> {
    const minuteKey = this.minuteKey(tenantId);
    const dayKey = this.dayKey(tenantId);
    const minuteCount = await this.incrWithTtl(minuteKey, 120);
    await this.incrWithTtl(dayKey, 86400 * 2);
    return minuteCount;
  }

  async getApiCallsLastMinute(tenantId: string): Promise<number> {
    return this.getCounter(this.minuteKey(tenantId));
  }

  async getApiCallsToday(tenantId: string): Promise<number> {
    return this.getCounter(this.dayKey(tenantId));
  }

  async getSeats(tenantId: string): Promise<number> {
    return this.prisma.user.count({
      where: { tenantId, status: "ACTIVE" },
    });
  }

  async getProjects(tenantId: string): Promise<number> {
    return this.prisma.project.count({
      where: { company: { tenantId } },
    });
  }

  async getStorageBytes(tenantId: string): Promise<number> {
    const agg = await this.prisma.document.aggregate({
      where: { tenantId },
      _sum: { fileSize: true },
    });
    return agg._sum.fileSize ?? 0;
  }

  async getUsage(tenantId: string): Promise<TenantUsageSnapshot> {
    const [apiCallsLastMinute, apiCallsToday, seats, projects, storageBytes] =
      await Promise.all([
        this.getApiCallsLastMinute(tenantId),
        this.getApiCallsToday(tenantId),
        this.getSeats(tenantId),
        this.getProjects(tenantId),
        this.getStorageBytes(tenantId),
      ]);
    return {
      apiCallsLastMinute,
      apiCallsToday,
      seats,
      projects,
      storageBytes,
    };
  }

  /** Reject if adding `deltaSeats` would exceed the seat cap. */
  async assertSeatAvailable(
    tenantId: string,
    deltaSeats = 1,
  ): Promise<void> {
    const [{ plan, limits }, seats] = await Promise.all([
      this.limits.getEffectiveLimits(tenantId),
      this.getSeats(tenantId),
    ]);
    if (seats + deltaSeats > limits.maxSeats) {
      throw new ForbiddenException({
        code: PLAN_LIMIT_ERROR,
        limit: "seats",
        plan,
        max: limits.maxSeats,
        current: seats,
        message: `Seat limit reached (${limits.maxSeats} on ${plan}). Upgrade plan or deactivate users.`,
      });
    }
  }

  /** Reject if adding `deltaProjects` would exceed the project cap (-1 = unlimited). */
  async assertProjectAvailable(
    tenantId: string,
    deltaProjects = 1,
  ): Promise<void> {
    const [{ plan, limits }, projects] = await Promise.all([
      this.limits.getEffectiveLimits(tenantId),
      this.getProjects(tenantId),
    ]);
    if (limits.maxProjects < 0) return;
    if (projects + deltaProjects > limits.maxProjects) {
      throw new ForbiddenException({
        code: PLAN_LIMIT_ERROR,
        limit: "projects",
        plan,
        max: limits.maxProjects,
        current: projects,
        message: `Project limit reached (${limits.maxProjects} on ${plan}). Upgrade plan to add more projects.`,
      });
    }
  }

  /** Reject if adding `deltaBytes` would exceed storage cap. */
  async assertStorageAvailable(
    tenantId: string,
    deltaBytes: number,
  ): Promise<void> {
    if (deltaBytes <= 0) return;
    const [{ plan, limits }, used] = await Promise.all([
      this.limits.getEffectiveLimits(tenantId),
      this.getStorageBytes(tenantId),
    ]);
    if (used + deltaBytes > limits.maxStorageBytes) {
      throw new ForbiddenException({
        code: PLAN_LIMIT_ERROR,
        limit: "storage",
        plan,
        max: limits.maxStorageBytes,
        current: used,
        message: `Storage limit reached (${limits.maxStorageBytes} bytes on ${plan}). Upgrade plan for more storage.`,
      });
    }
  }

  private minuteKey(tenantId: string): string {
    const bucket = Math.floor(Date.now() / 60_000);
    return `tenant:${tenantId}:rl:api:${bucket}`;
  }

  private dayKey(tenantId: string): string {
    const day = new Date().toISOString().slice(0, 10);
    return `tenant:${tenantId}:usage:api:${day}`;
  }

  private async getCounter(key: string): Promise<number> {
    if (this.redis.isReady()) {
      const raw = await this.redis.get(key);
      if (!raw) return 0;
      const n = Number.parseInt(raw, 10);
      return Number.isFinite(n) ? n : 0;
    }
    const entry = this.memory.get(key);
    if (!entry || entry.expiresAt < Date.now()) return 0;
    return entry.count;
  }

  private async incrWithTtl(key: string, ttlSeconds: number): Promise<number> {
    if (!this.redis.isReady()) {
      return this.memoryIncr(key, ttlSeconds);
    }
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, ttlSeconds);
    }
    return count;
  }

  private readonly memory = new Map<
    string,
    { count: number; expiresAt: number }
  >();

  private memoryIncr(key: string, ttlSeconds: number): number {
    const now = Date.now();
    const existing = this.memory.get(key);
    if (!existing || existing.expiresAt < now) {
      this.memory.set(key, {
        count: 1,
        expiresAt: now + ttlSeconds * 1000,
      });
      return 1;
    }
    existing.count += 1;
    return existing.count;
  }

  /** Test helper — clear in-memory counters. */
  clearMemoryForTests(): void {
    this.memory.clear();
  }
}
