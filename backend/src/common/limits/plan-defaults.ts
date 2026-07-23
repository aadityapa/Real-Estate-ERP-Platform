import type { PlanType } from "@prisma/client";

/** Feature flags gated by plan (and optional TenantLimits overrides). */
export const PLAN_FEATURES = [
  "crm",
  "lms",
  "finance",
  "documents",
  "construction",
  "api_access",
  "sso",
  "custom_roles",
  "advanced_analytics",
] as const;

export type PlanFeature = (typeof PLAN_FEATURES)[number];

/** Effective limits after plan defaults + optional TenantLimits overrides. */
export interface EffectiveTenantLimits {
  apiRateLimitRpm: number;
  maxSeats: number;
  /** Max projects; -1 = unlimited. */
  maxProjects: number;
  /** Storage cap in bytes (integer; never float). */
  maxStorageBytes: number;
  queueConcurrency: number;
  features: Record<PlanFeature, boolean>;
}

export interface PlanCatalogEntry extends EffectiveTenantLimits {
  /** List price monthly in integer paise (INR). */
  priceMonthlyPaise: number;
  /** List price yearly in integer paise (INR). */
  priceYearlyPaise: number;
  /** Trial length in days when starting a paid subscription. */
  trialDays: number;
}

function features(
  enabled: PlanFeature[],
): Record<PlanFeature, boolean> {
  const all = Object.fromEntries(
    PLAN_FEATURES.map((f) => [f, false]),
  ) as Record<PlanFeature, boolean>;
  for (const f of enabled) all[f] = true;
  return all;
}

/** Plan defaults — Phase 5.2 SaaS billing maps paid tiers onto these. */
export const PLAN_LIMIT_DEFAULTS: Record<PlanType, PlanCatalogEntry> = {
  STARTER: {
    apiRateLimitRpm: 60,
    maxSeats: 5,
    maxProjects: 1,
    maxStorageBytes: 1 * 1024 * 1024 * 1024, // 1 GiB
    queueConcurrency: 2,
    features: features(["crm", "documents"]),
    priceMonthlyPaise: 499_900, // ₹4,999
    priceYearlyPaise: 4_999_000, // ₹49,990 (~2 mo free)
    trialDays: 14,
  },
  GROWTH: {
    apiRateLimitRpm: 300,
    maxSeats: 25,
    maxProjects: 10,
    maxStorageBytes: 10 * 1024 * 1024 * 1024, // 10 GiB
    queueConcurrency: 5,
    features: features([
      "crm",
      "lms",
      "finance",
      "documents",
      "construction",
      "api_access",
    ]),
    priceMonthlyPaise: 1_499_900, // ₹14,999
    priceYearlyPaise: 14_999_000,
    trialDays: 14,
  },
  ENTERPRISE: {
    apiRateLimitRpm: 1000,
    maxSeats: 200,
    maxProjects: -1, // unlimited
    maxStorageBytes: 100 * 1024 * 1024 * 1024, // 100 GiB
    queueConcurrency: 20,
    features: features([...PLAN_FEATURES]),
    priceMonthlyPaise: 4_999_900, // ₹49,999
    priceYearlyPaise: 49_999_000,
    trialDays: 14,
  },
};

export interface LimitOverrides {
  apiRateLimitRpm?: number | null;
  maxSeats?: number | null;
  maxProjects?: number | null;
  maxStorageBytes?: number | bigint | null;
  queueConcurrency?: number | null;
  featureFlags?: Partial<Record<PlanFeature, boolean>> | null;
}

export function mergePlanLimits(
  plan: PlanType,
  overrides?: LimitOverrides | null,
): EffectiveTenantLimits {
  const base = PLAN_LIMIT_DEFAULTS[plan] ?? PLAN_LIMIT_DEFAULTS.STARTER;
  const featuresMerged: Record<PlanFeature, boolean> = { ...base.features };
  if (overrides?.featureFlags) {
    for (const key of PLAN_FEATURES) {
      const v = overrides.featureFlags[key];
      if (typeof v === "boolean") featuresMerged[key] = v;
    }
  }
  return {
    apiRateLimitRpm:
      overrides?.apiRateLimitRpm != null
        ? overrides.apiRateLimitRpm
        : base.apiRateLimitRpm,
    maxSeats:
      overrides?.maxSeats != null ? overrides.maxSeats : base.maxSeats,
    maxProjects:
      overrides?.maxProjects != null ? overrides.maxProjects : base.maxProjects,
    maxStorageBytes:
      overrides?.maxStorageBytes != null
        ? Number(overrides.maxStorageBytes)
        : base.maxStorageBytes,
    queueConcurrency:
      overrides?.queueConcurrency != null
        ? overrides.queueConcurrency
        : base.queueConcurrency,
    features: featuresMerged,
  };
}

/** Normalize yearly price to monthly MRR (integer paise; floor). */
export function mrrPaiseFor(
  plan: PlanType,
  billingCycle: "MONTHLY" | "YEARLY",
): number {
  const catalog = PLAN_LIMIT_DEFAULTS[plan] ?? PLAN_LIMIT_DEFAULTS.STARTER;
  if (billingCycle === "YEARLY") {
    return Math.floor(catalog.priceYearlyPaise / 12);
  }
  return catalog.priceMonthlyPaise;
}

export function listPlanCatalog(): Array<{
  plan: PlanType;
  entitlements: PlanCatalogEntry;
}> {
  return (Object.keys(PLAN_LIMIT_DEFAULTS) as PlanType[]).map((plan) => ({
    plan,
    entitlements: PLAN_LIMIT_DEFAULTS[plan],
  }));
}
