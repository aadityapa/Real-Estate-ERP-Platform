import {
  evaluateCarpetArea,
  evaluatePaymentStageRule,
  maxAllowedPaiseFromPct,
  resolveApplicableStage,
  rupeesToPaise,
  type ReraStageInput,
} from "./rera-rules";

const STAGES: ReraStageInput[] = [
  {
    code: "BOOKING",
    name: "Booking",
    maxCumulativePctBps: 1000, // 10%
    sortOrder: 1,
    isCompleted: true,
  },
  {
    code: "PLINTH",
    name: "Plinth",
    maxCumulativePctBps: 3000, // 30%
    sortOrder: 2,
    isCompleted: false,
  },
  {
    code: "SLAB",
    name: "Slab casting",
    maxCumulativePctBps: 7000, // 70%
    sortOrder: 3,
    isCompleted: false,
  },
  {
    code: "POSSESSION",
    name: "Possession",
    maxCumulativePctBps: 10000,
    sortOrder: 4,
    isCompleted: false,
  },
];

describe("rera-rules payment stage engine", () => {
  const total = 10_000_00n; // ₹10,00,000 in paise

  it("uses booking cap when only booking is completed", () => {
    const stage = resolveApplicableStage(STAGES);
    expect(stage?.code).toBe("BOOKING");
    expect(maxAllowedPaiseFromPct(total, 1000)).toBe(1_000_00n);
  });

  it("allows payment within booking 10% cap", () => {
    const result = evaluatePaymentStageRule({
      totalConsiderationPaise: total,
      alreadyPaidPaise: 500_00n,
      proposedPaymentPaise: 400_00n,
      stages: STAGES,
    });
    expect(result.configured).toBe(true);
    expect(result.allowed).toBe(true);
    expect(result.applicableStageCode).toBe("BOOKING");
    expect(result.maxAllowedPaise).toBe(1_000_00n);
  });

  it("blocks payment that would exceed stage cap", () => {
    const result = evaluatePaymentStageRule({
      totalConsiderationPaise: total,
      alreadyPaidPaise: 900_00n,
      proposedPaymentPaise: 200_00n,
      stages: STAGES,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("BOOKING");
    expect(result.projectedPaidPaise).toBe(1_100_00n);
  });

  it("raises cap after plinth is completed", () => {
    const stages = STAGES.map((s) =>
      s.code === "PLINTH" ? { ...s, isCompleted: true } : s,
    );
    const result = evaluatePaymentStageRule({
      totalConsiderationPaise: total,
      alreadyPaidPaise: 2_500_00n,
      proposedPaymentPaise: 400_00n,
      stages,
    });
    expect(result.applicableStageCode).toBe("PLINTH");
    expect(result.maxAllowedPaise).toBe(3_000_00n);
    expect(result.allowed).toBe(true);
  });

  it("uses highest completed stage when multiple done", () => {
    const stages = STAGES.map((s) =>
      s.code === "PLINTH" || s.code === "SLAB"
        ? { ...s, isCompleted: true }
        : s,
    );
    const stage = resolveApplicableStage(stages);
    expect(stage?.code).toBe("SLAB");
    expect(stage?.maxCumulativePctBps).toBe(7000);
  });

  it("treats empty stages as unconfigured (allow with note)", () => {
    const result = evaluatePaymentStageRule({
      totalConsiderationPaise: total,
      alreadyPaidPaise: 0n,
      proposedPaymentPaise: total,
      stages: [],
    });
    expect(result.configured).toBe(false);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe("no_rera_payment_stages_configured");
  });

  it("rounds half-up on percentage of odd totals", () => {
    // 333 paise * 10% = 33.3 → 33; with half-up on (333*1000+5000)/10000 = 33.8 → 34? 
    // (333n * 1000n + 5000n) / 10000n = 338000/10000 = 33n (integer div truncates toward 0 in bigint)
    // Actually for half-up we need: for 0.5 we round up. 333*1000=333000 +5000=338000 /10000 = 33
    // For 335: 335000+5000=340000/10000=34
    expect(maxAllowedPaiseFromPct(335n, 1000)).toBe(34n);
  });
});

describe("rera-rules carpet area", () => {
  it("flags missing carpet area", () => {
    const r = evaluateCarpetArea({ unitCarpetAreaSqm: null });
    expect(r.ok).toBe(false);
    expect(r.flags).toContain("missing_carpet_area");
  });

  it("passes when unit matches declared within tolerance", () => {
    const r = evaluateCarpetArea({
      unitCarpetAreaSqm: 50.4,
      declaredCarpetAreaSqm: 50,
      tolerancePctBps: 100, // 1%
    });
    expect(r.ok).toBe(true);
  });

  it("flags variance beyond tolerance", () => {
    const r = evaluateCarpetArea({
      unitCarpetAreaSqm: 55,
      declaredCarpetAreaSqm: 50,
      tolerancePctBps: 100,
    });
    expect(r.ok).toBe(false);
    expect(r.flags).toContain("carpet_area_variance");
  });

  it("converts rupees to paise", () => {
    expect(rupeesToPaise(10.505)).toBe(1051n);
    expect(rupeesToPaise("100")).toBe(10000n);
  });
});
