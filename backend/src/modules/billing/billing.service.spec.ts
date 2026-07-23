import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { BillingService } from "./billing.service";
import { BillingAnalyticsService } from "./billing-analytics.service";
import type { SubscriptionGateway } from "./gateway/subscription-gateway.interface";
import { FeatureFlagsGuard } from "../../common/limits/feature-flags.guard";
import { TenantUsageService } from "../../common/limits/tenant-usage.service";
import type { TenantLimitsService } from "../../common/limits/tenant-limits.service";
import type { PrismaService } from "../../database/prisma.service";
import type { RedisService } from "../../common/redis/redis.service";
import { PLAN_LIMIT_DEFAULTS } from "../../common/limits/plan-defaults";

type MockFn = jest.Mock;

describe("BillingService", () => {
  let service: BillingService;
  let gateway: jest.Mocked<SubscriptionGateway>;
  let analytics: BillingAnalyticsService;
  let prisma: {
    subscription: {
      findFirst: MockFn;
      findUnique: MockFn;
      create: MockFn;
      update: MockFn;
    };
    saasInvoice: { findMany: MockFn; create: MockFn; count: MockFn };
    tenant: { update: MockFn };
    gatewayWebhookEvent: { findUnique: MockFn; create: MockFn };
  };
  let tenantContext: { runAsSystem: MockFn };
  let limits: {
    getEffectiveLimits: MockFn;
  };

  const tenantId = "tenant-a";

  beforeEach(() => {
    gateway = {
      provider: "RAZORPAY",
      createPlan: jest.fn().mockResolvedValue({ planId: "plan_growth" }),
      createSubscription: jest.fn().mockResolvedValue({
        subscriptionId: "sub_1",
        status: "created",
        shortUrl: "https://rzp.io/sub",
      }),
      updateSubscription: jest.fn().mockResolvedValue({
        subscriptionId: "sub_1",
        status: "active",
      }),
      cancelSubscription: jest.fn().mockResolvedValue({
        subscriptionId: "sub_1",
        status: "cancelled",
      }),
      verifyWebhookSignature: jest.fn().mockReturnValue(true),
    };

    prisma = {
      subscription: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        create: jest.fn().mockImplementation(({ data }: { data: object }) =>
          Promise.resolve({
            id: "sub-row-1",
            tenantId,
            ...data,
            amountPaise: (data as { amountPaise: bigint }).amountPaise,
            mrrPaise: (data as { mrrPaise: bigint }).mrrPaise,
            cancelAtPeriodEnd: false,
            cancelledAt: null,
            dunningStatus: "NONE",
            dunningAttempts: 0,
            lastPaymentAt: null,
            nextRetryAt: null,
            endDate: null,
            providerPlanId: "plan_growth",
            currency: "INR",
            startDate: new Date(),
          }),
        ),
        update: jest.fn().mockImplementation(({ data }: { data: object }) =>
          Promise.resolve({
            id: "sub-row-1",
            tenantId,
            plan: "GROWTH",
            status: "ACTIVE",
            billingCycle: "MONTHLY",
            amountPaise: BigInt(PLAN_LIMIT_DEFAULTS.GROWTH.priceMonthlyPaise),
            mrrPaise: BigInt(PLAN_LIMIT_DEFAULTS.GROWTH.priceMonthlyPaise),
            currency: "INR",
            providerSubscriptionId: "sub_1",
            providerPlanId: "plan_growth",
            startDate: new Date(),
            endDate: null,
            trialEndsAt: null,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(),
            cancelAtPeriodEnd: false,
            cancelledAt: null,
            dunningStatus: "NONE",
            dunningAttempts: 0,
            lastPaymentAt: null,
            nextRetryAt: null,
            ...data,
          }),
        ),
      },
      saasInvoice: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
      },
      tenant: {
        update: jest.fn().mockResolvedValue({}),
      },
      gatewayWebhookEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
    };

    tenantContext = {
      runAsSystem: jest.fn((fn: () => unknown) => fn()),
    };

    limits = {
      getEffectiveLimits: jest.fn().mockResolvedValue({
        tenantId,
        plan: "STARTER",
        limits: PLAN_LIMIT_DEFAULTS.STARTER,
        overrides: null,
      }),
    };

    analytics = new BillingAnalyticsService();
    analytics.drainForTests();

    const usage = {
      getUsage: jest.fn().mockResolvedValue({
        apiCallsLastMinute: 0,
        apiCallsToday: 0,
        seats: 1,
        projects: 0,
        storageBytes: 0,
      }),
    };

    service = new BillingService(
      prisma as never,
      tenantContext as never,
      limits as never,
      usage as never,
      analytics,
      gateway,
    );
  });

  it("startSubscription creates gateway sub and lifts tenant plan", async () => {
    const result = await service.startSubscription(tenantId, {
      plan: "GROWTH",
      billingCycle: "MONTHLY",
      startTrial: true,
    });

    expect(gateway.createPlan).toHaveBeenCalled();
    expect(gateway.createSubscription).toHaveBeenCalled();
    expect(prisma.tenant.update).toHaveBeenCalledWith({
      where: { id: tenantId },
      data: { plan: "GROWTH" },
    });
    expect(result.checkout.providerSubscriptionId).toBe("sub_1");
    expect(result.subscription.plan).toBe("GROWTH");
    expect(result.subscription.amountPaise).toBe(
      String(PLAN_LIMIT_DEFAULTS.GROWTH.priceMonthlyPaise),
    );

    const events = analytics.drainForTests();
    expect(events.some((e) => e.type === "billing.trial_started")).toBe(true);
    expect(events.some((e) => e.type === "billing.mrr_changed")).toBe(true);
  });

  it("rejects webhook with bad signature", async () => {
    gateway.verifyWebhookSignature.mockReturnValue(false);
    await expect(
      service.handleWebhook("{}", "bad"),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("webhook idempotency returns DUPLICATE on replay", async () => {
    prisma.gatewayWebhookEvent.findUnique.mockResolvedValue({
      id: "wh-1",
      eventId: "evt_1",
    });

    const body = JSON.stringify({
      id: "evt_1",
      event: "subscription.charged",
      payload: {
        subscription: {
          entity: {
            id: "sub_1",
            notes: { tenantId },
          },
        },
      },
    });

    const first = await service.handleWebhook(body, "sig");
    expect(first.status).toBe("DUPLICATE");
    expect(prisma.subscription.update).not.toHaveBeenCalled();
  });

  it("subscription.charged activates trial and writes invoice", async () => {
    prisma.subscription.findFirst.mockResolvedValue({
      id: "sub-row-1",
      tenantId,
      plan: "GROWTH",
      status: "TRIAL",
      amountPaise: BigInt(PLAN_LIMIT_DEFAULTS.GROWTH.priceMonthlyPaise),
      mrrPaise: BigInt(PLAN_LIMIT_DEFAULTS.GROWTH.priceMonthlyPaise),
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(),
      providerSubscriptionId: "sub_1",
    });

    const body = JSON.stringify({
      id: "evt_charge_1",
      event: "subscription.charged",
      payload: {
        subscription: {
          entity: {
            id: "sub_1",
            plan_id: "plan_growth",
            current_start: 1_700_000_000,
            current_end: 1_700_259_200,
            notes: { tenantId },
          },
        },
        payment: { entity: { id: "pay_1", amount: 1_499_900 } },
        invoice: {
          entity: {
            id: "inv_1",
            amount: 1_499_900,
            billing_start: 1_700_000_000,
            billing_end: 1_700_259_200,
          },
        },
      },
    });

    const result = await service.handleWebhook(body, "sig");
    expect(result.status).toBe("PROCESSED");
    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "ACTIVE" }),
      }),
    );
    expect(prisma.saasInvoice.create).toHaveBeenCalled();
    expect(prisma.gatewayWebhookEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventId: "evt_charge_1",
          status: "PROCESSED",
        }),
      }),
    );
  });

  it("changePlan upgrades and updates MRR", async () => {
    prisma.subscription.findFirst.mockResolvedValue({
      id: "sub-row-1",
      tenantId,
      plan: "STARTER",
      status: "ACTIVE",
      billingCycle: "MONTHLY",
      amountPaise: BigInt(PLAN_LIMIT_DEFAULTS.STARTER.priceMonthlyPaise),
      mrrPaise: BigInt(PLAN_LIMIT_DEFAULTS.STARTER.priceMonthlyPaise),
      providerSubscriptionId: "sub_1",
      providerPlanId: "plan_starter",
    });

    const result = await service.changePlan(tenantId, {
      plan: "GROWTH",
      scheduleChangeAt: "now",
    });

    expect(gateway.updateSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ scheduleChangeAt: "now" }),
    );
    expect(prisma.tenant.update).toHaveBeenCalledWith({
      where: { id: tenantId },
      data: { plan: "GROWTH" },
    });
    expect(result.subscription.plan).toBe("GROWTH");
  });
});

describe("Entitlement enforcement (seats + features)", () => {
  function mockLimits(plan: "STARTER" | "GROWTH"): TenantLimitsService {
    return {
      getEffectiveLimits: jest.fn().mockResolvedValue({
        tenantId: "t1",
        plan,
        limits: PLAN_LIMIT_DEFAULTS[plan],
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

  function mockPrisma(seats: number, projects = 0): PrismaService {
    return {
      user: { count: jest.fn().mockResolvedValue(seats) },
      project: { count: jest.fn().mockResolvedValue(projects) },
      document: {
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { fileSize: 0 } }),
      },
    } as unknown as PrismaService;
  }

  it("STARTER is blocked at seat limit; GROWTH lifts it", async () => {
    const starterUsage = new TenantUsageService(
      mockRedis(),
      mockPrisma(5),
      mockLimits("STARTER"),
    );
    try {
      await starterUsage.assertSeatAvailable("t1", 1);
      fail("expected ForbiddenException");
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenException);
      expect((err as ForbiddenException).getResponse()).toMatchObject({
        code: "PLAN_LIMIT_EXCEEDED",
        limit: "seats",
        max: 5,
      });
    }

    const growthUsage = new TenantUsageService(
      mockRedis(),
      mockPrisma(5),
      mockLimits("GROWTH"),
    );
    await expect(growthUsage.assertSeatAvailable("t1", 1)).resolves.toBeUndefined();
  });

  it("STARTER is blocked at project limit", async () => {
    const usage = new TenantUsageService(
      mockRedis(),
      mockPrisma(1, 1),
      mockLimits("STARTER"),
    );
    await expect(usage.assertProjectAvailable("t1", 1)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it("FeatureFlagsGuard blocks STARTER from api_access", async () => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === "isPublic") return false;
        if (key === "planFeatures") return ["api_access"];
        return undefined;
      }),
    } as unknown as Reflector;

    const guard = new FeatureFlagsGuard(reflector, mockLimits("STARTER"));
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: { tenantId: "t1" } }),
      }),
    } as never;

    try {
      await guard.canActivate(ctx);
      fail("expected ForbiddenException");
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenException);
      expect((err as ForbiddenException).getResponse()).toMatchObject({
        code: "PLAN_LIMIT_EXCEEDED",
        limit: "features",
      });
    }

    const growthGuard = new FeatureFlagsGuard(
      reflector,
      mockLimits("GROWTH"),
    );
    await expect(growthGuard.canActivate(ctx)).resolves.toBe(true);
  });
});
