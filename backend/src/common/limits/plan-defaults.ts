import type { PlanType } from "@prisma/client";

/** Effective limits after plan defaults + optional TenantLimits overrides. */
export interface EffectiveTenantLimits {
  apiRateLimitRpm: number;
  maxSeats: number;
  /** Storage cap in bytes (integer; never float). */
  maxStorageBytes: number;
  queueConcurrency: number;
}

/** Plan defaults — Phase 5 billing will map paid tiers onto these. */
export const PLAN_LIMIT_DEFAULTS: Record<PlanType, EffectiveTenantLimits> = {
  STARTER: {
    apiRateLimitRpm: 60,
    maxSeats: 5,
    maxStorageBytes: 1 * 1024 * 1024 * 1024, // 1 GiB
    queueConcurrency: 2,
  },
  GROWTH: {
    apiRateLimitRpm: 300,
    maxSeats: 25,
    maxStorageBytes: 10 * 1024 * 1024 * 1024, // 10 GiB
    queueConcurrency: 5,
  },
  ENTERPRISE: {
    apiRateLimitRpm: 1000,
    maxSeats: 200,
    maxStorageBytes: 100 * 1024 * 1024 * 1024, // 100 GiB
    queueConcurrency: 20,
  },
};

export interface LimitOverrides {
  apiRateLimitRpm?: number | null;
  maxSeats?: number | null;
  maxStorageBytes?: number | bigint | null;
  queueConcurrency?: number | null;
}

export function mergePlanLimits(
  plan: PlanType,
  overrides?: LimitOverrides | null,
): EffectiveTenantLimits {
  const base = PLAN_LIMIT_DEFAULTS[plan] ?? PLAN_LIMIT_DEFAULTS.STARTER;
  return {
    apiRateLimitRpm:
      overrides?.apiRateLimitRpm != null
        ? overrides.apiRateLimitRpm
        : base.apiRateLimitRpm,
    maxSeats:
      overrides?.maxSeats != null ? overrides.maxSeats : base.maxSeats,
    maxStorageBytes:
      overrides?.maxStorageBytes != null
        ? Number(overrides.maxStorageBytes)
        : base.maxStorageBytes,
    queueConcurrency:
      overrides?.queueConcurrency != null
        ? overrides.queueConcurrency
        : base.queueConcurrency,
  };
}
