import { mergePlanLimits, PLAN_LIMIT_DEFAULTS } from "./plan-defaults";

describe("mergePlanLimits", () => {
  it("returns plan defaults when overrides are null", () => {
    expect(mergePlanLimits("STARTER")).toEqual(PLAN_LIMIT_DEFAULTS.STARTER);
    expect(mergePlanLimits("GROWTH", null).apiRateLimitRpm).toBe(300);
    expect(mergePlanLimits("ENTERPRISE").queueConcurrency).toBe(20);
  });

  it("applies partial overrides over plan defaults", () => {
    const merged = mergePlanLimits("STARTER", {
      apiRateLimitRpm: 10,
      maxSeats: null,
    });
    expect(merged.apiRateLimitRpm).toBe(10);
    expect(merged.maxSeats).toBe(PLAN_LIMIT_DEFAULTS.STARTER.maxSeats);
    expect(merged.maxStorageBytes).toBe(
      PLAN_LIMIT_DEFAULTS.STARTER.maxStorageBytes,
    );
  });

  it("coerces BigInt storage overrides to number", () => {
    const merged = mergePlanLimits("GROWTH", {
      maxStorageBytes: BigInt(5_000_000),
    });
    expect(merged.maxStorageBytes).toBe(5_000_000);
  });
});
