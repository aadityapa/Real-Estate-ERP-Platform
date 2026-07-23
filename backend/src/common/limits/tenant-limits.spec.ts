import { ForbiddenException, HttpException, HttpStatus } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { TenantUsageService } from "./tenant-usage.service";
import { TenantRateLimitGuard } from "./tenant-rate-limit.guard";
import { TenantQueueService } from "./tenant-queue.service";
import type { TenantLimitsService } from "./tenant-limits.service";
import type { RedisService } from "../redis/redis.service";
import type { PrismaService } from "../../database/prisma.service";
import type { ConfigService } from "@nestjs/config";
import { PLAN_LIMIT_DEFAULTS } from "./plan-defaults";

function mockLimits(
  rpm: number,
  queueConcurrency = 2,
): TenantLimitsService {
  return {
    getEffectiveLimits: jest.fn().mockResolvedValue({
      tenantId: "t1",
      plan: "STARTER",
      limits: {
        apiRateLimitRpm: rpm,
        maxSeats: 5,
        maxProjects: 1,
        maxStorageBytes: 1_000_000,
        queueConcurrency,
        features: {
          crm: true,
          lms: false,
          finance: false,
          documents: true,
          construction: false,
          api_access: false,
          sso: false,
          custom_roles: false,
          advanced_analytics: false,
        },
      },
      overrides: null,
    }),
  } as unknown as TenantLimitsService;
}

function mockRedis(): RedisService {
  return {
    isReady: () => false,
    get: jest.fn(),
    set: jest.fn(),
    incr: jest.fn(),
    decr: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    del: jest.fn(),
  } as unknown as RedisService;
}

function mockPrisma(seats = 0, storage = 0, projects = 0): PrismaService {
  return {
    user: { count: jest.fn().mockResolvedValue(seats) },
    project: { count: jest.fn().mockResolvedValue(projects) },
    document: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { fileSize: storage } }),
    },
  } as unknown as PrismaService;
}

describe("TenantUsageService", () => {
  it("records API calls in memory and enforces seat/storage caps", async () => {
    const limits = mockLimits(3);
    const usage = new TenantUsageService(
      mockRedis(),
      mockPrisma(5, 900_000),
      limits,
    );
    usage.clearMemoryForTests();

    expect(await usage.recordApiCall("t1")).toBe(1);
    expect(await usage.recordApiCall("t1")).toBe(2);
    expect(await usage.getApiCallsLastMinute("t1")).toBe(2);

    await expect(usage.assertSeatAvailable("t1", 1)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      usage.assertStorageAvailable("t1", 200_000),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(usage.assertStorageAvailable("t1", 50_000)).resolves.toBeUndefined();
  });
});

describe("TenantRateLimitGuard", () => {
  it("allows under limit and rejects when RPM exceeded", async () => {
    const limits = mockLimits(2);
    const usage = new TenantUsageService(
      mockRedis(),
      mockPrisma(),
      limits,
    );
    usage.clearMemoryForTests();
    const guard = new TenantRateLimitGuard(
      new Reflector(),
      limits,
      usage,
    );

    const ctx = {
      getType: () => "http",
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: { tenantId: "t1" } }),
      }),
    } as never;

    expect(await guard.canActivate(ctx)).toBe(true);
    expect(await guard.canActivate(ctx)).toBe(true);
    await expect(guard.canActivate(ctx)).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    } as Partial<HttpException>);
  });

  it("skips public routes", async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(true),
    } as unknown as Reflector;
    const guard = new TenantRateLimitGuard(
      reflector,
      mockLimits(1),
      new TenantUsageService(mockRedis(), mockPrisma(), mockLimits(1)),
    );
    const ctx = {
      getType: () => "http",
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({}) }),
    } as never;
    expect(await guard.canActivate(ctx)).toBe(true);
  });
});

describe("TenantQueueService fairness", () => {
  it("caps concurrent slots per tenant without blocking another tenant", async () => {
    const limits: TenantLimitsService = {
      getEffectiveLimits: jest.fn(async (tenantId: string) => ({
        tenantId,
        plan: "STARTER" as const,
        limits: {
          apiRateLimitRpm: 60,
          maxSeats: 5,
          maxProjects: 1,
          maxStorageBytes: 1_000_000,
          queueConcurrency: 1,
          features: PLAN_LIMIT_DEFAULTS.STARTER.features,
        },
        overrides: null,
      })),
    } as unknown as TenantLimitsService;

    const queue = new TenantQueueService(
      { get: () => undefined } as unknown as ConfigService,
      mockRedis(),
      limits,
    );
    queue.clearMemoryForTests();

    const held: Array<() => void> = [];
    const block = () =>
      new Promise<void>((resolve) => {
        held.push(resolve);
      });

    const runA = queue.runFairJob("tenant-a", block);
    // Allow A to acquire its only slot before the next attempt.
    await new Promise((r) => setImmediate(r));
    const deferredA = await queue.runFairJob("tenant-a", async () => undefined);
    expect(deferredA).toBe("deferred");

    const okB = await queue.runFairJob("tenant-b", async () => undefined);
    expect(okB).toBe("ok");

    held.forEach((r) => r());
    expect(await runA).toBe("ok");
  });
});
