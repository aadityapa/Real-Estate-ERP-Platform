import {
  mergePlanLimits,
  PLAN_LIMIT_DEFAULTS,
  mrrPaiseFor,
  listPlanCatalog,
} from "./plan-defaults";

describe("mergePlanLimits", () => {
  it("returns plan defaults when overrides are null", () => {
    expect(mergePlanLimits("STARTER").maxSeats).toBe(
      PLAN_LIMIT_DEFAULTS.STARTER.maxSeats,
    );
    expect(mergePlanLimits("GROWTH", null).apiRateLimitRpm).toBe(300);
    expect(mergePlanLimits("ENTERPRISE").queueConcurrency).toBe(20);
    expect(mergePlanLimits("STARTER").maxProjects).toBe(1);
    expect(mergePlanLimits("ENTERPRISE").maxProjects).toBe(-1);
  });

  it("applies partial overrides over plan defaults", () => {
    const merged = mergePlanLimits("STARTER", {
      apiRateLimitRpm: 10,
      maxSeats: null,
      maxProjects: 3,
    });
    expect(merged.apiRateLimitRpm).toBe(10);
    expect(merged.maxSeats).toBe(PLAN_LIMIT_DEFAULTS.STARTER.maxSeats);
    expect(merged.maxProjects).toBe(3);
    expect(merged.maxStorageBytes).toBe(
      PLAN_LIMIT_DEFAULTS.STARTER.maxStorageBytes,
    );
  });

  it("merges feature flag overrides", () => {
    const merged = mergePlanLimits("STARTER", {
      featureFlags: { api_access: true },
    });
    expect(merged.features.api_access).toBe(true);
    expect(merged.features.crm).toBe(true);
    expect(merged.features.sso).toBe(false);
  });

  it("coerces BigInt storage overrides to number", () => {
    const merged = mergePlanLimits("GROWTH", {
      maxStorageBytes: BigInt(5_000_000),
    });
    expect(merged.maxStorageBytes).toBe(5_000_000);
  });

  it("computes MRR for monthly and yearly", () => {
    expect(mrrPaiseFor("GROWTH", "MONTHLY")).toBe(
      PLAN_LIMIT_DEFAULTS.GROWTH.priceMonthlyPaise,
    );
    expect(mrrPaiseFor("GROWTH", "YEARLY")).toBe(
      Math.floor(PLAN_LIMIT_DEFAULTS.GROWTH.priceYearlyPaise / 12),
    );
  });

  it("lists catalog for all plans", () => {
    const catalog = listPlanCatalog();
    expect(catalog.map((c) => c.plan).sort()).toEqual([
      "ENTERPRISE",
      "GROWTH",
      "STARTER",
    ]);
  });
});
