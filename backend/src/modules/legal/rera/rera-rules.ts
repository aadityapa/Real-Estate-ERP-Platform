/**
 * RERA payment-stage + carpet-area rule engine (pure; unit-tested).
 * Money inputs are integer paise. Percentages are basis points (1000 = 10%).
 */

export type ReraStageInput = {
  code: string;
  name: string;
  /** Max cumulative % of consideration collectible once this stage applies. */
  maxCumulativePctBps: number;
  sortOrder: number;
  isCompleted: boolean;
};

export type PaymentStageEval = {
  configured: boolean;
  allowed: boolean;
  maxCumulativePctBps: number;
  maxAllowedPaise: bigint;
  projectedPaidPaise: bigint;
  applicableStageCode: string | null;
  reason?: string;
};

export type CarpetAreaEval = {
  ok: boolean;
  flags: string[];
  variancePctBps: number | null;
};

/** Sort stages ascending; applicable cap = last completed, else first (booking). */
export function resolveApplicableStage(
  stages: ReraStageInput[],
): ReraStageInput | null {
  if (stages.length === 0) return null;
  const sorted = [...stages].sort((a, b) => a.sortOrder - b.sortOrder);
  let applicable = sorted[0]!;
  for (const s of sorted) {
    if (s.isCompleted) applicable = s;
  }
  return applicable;
}

export function maxAllowedPaiseFromPct(
  totalConsiderationPaise: bigint,
  maxCumulativePctBps: number,
): bigint {
  if (totalConsiderationPaise < 0n) {
    throw new Error("totalConsiderationPaise must be non-negative");
  }
  if (maxCumulativePctBps < 0 || !Number.isInteger(maxCumulativePctBps)) {
    throw new Error("maxCumulativePctBps must be a non-negative integer");
  }
  // Round half-up: (total * bps + 5000) / 10000
  return (totalConsiderationPaise * BigInt(maxCumulativePctBps) + 5000n) / 10000n;
}

/**
 * Payment cannot exceed the cumulative % allowed for the current construction stage.
 */
export function evaluatePaymentStageRule(args: {
  totalConsiderationPaise: bigint;
  alreadyPaidPaise: bigint;
  proposedPaymentPaise: bigint;
  stages: ReraStageInput[];
}): PaymentStageEval {
  const {
    totalConsiderationPaise,
    alreadyPaidPaise,
    proposedPaymentPaise,
    stages,
  } = args;

  if (alreadyPaidPaise < 0n || proposedPaymentPaise < 0n) {
    throw new Error("paid amounts must be non-negative");
  }

  const stage = resolveApplicableStage(stages);
  if (!stage) {
    return {
      configured: false,
      allowed: true,
      maxCumulativePctBps: 10000,
      maxAllowedPaise: totalConsiderationPaise,
      projectedPaidPaise: alreadyPaidPaise + proposedPaymentPaise,
      applicableStageCode: null,
      reason: "no_rera_payment_stages_configured",
    };
  }

  const maxAllowed = maxAllowedPaiseFromPct(
    totalConsiderationPaise,
    stage.maxCumulativePctBps,
  );
  const projected = alreadyPaidPaise + proposedPaymentPaise;
  const allowed = projected <= maxAllowed;

  return {
    configured: true,
    allowed,
    maxCumulativePctBps: stage.maxCumulativePctBps,
    maxAllowedPaise: maxAllowed,
    projectedPaidPaise: projected,
    applicableStageCode: stage.code,
    reason: allowed
      ? undefined
      : `payment_exceeds_rera_stage_cap:${stage.code}`,
  };
}

/**
 * Flag missing carpet area or variance vs declared RERA carpet (sq.m).
 * Default tolerance 1% (100 bps).
 */
export function evaluateCarpetArea(args: {
  unitCarpetAreaSqm: number | null | undefined;
  declaredCarpetAreaSqm?: number | null;
  tolerancePctBps?: number;
}): CarpetAreaEval {
  const flags: string[] = [];
  const tolerance = args.tolerancePctBps ?? 100;

  if (args.unitCarpetAreaSqm == null || !(args.unitCarpetAreaSqm > 0)) {
    flags.push("missing_carpet_area");
    return { ok: false, flags, variancePctBps: null };
  }

  const declared = args.declaredCarpetAreaSqm;
  if (declared == null || !(declared > 0)) {
    return { ok: true, flags, variancePctBps: null };
  }

  const variance =
    (Math.abs(args.unitCarpetAreaSqm - declared) / declared) * 10000;
  const variancePctBps = Math.round(variance);
  if (variancePctBps > tolerance) {
    flags.push("carpet_area_variance");
    return { ok: false, flags, variancePctBps };
  }

  return { ok: true, flags, variancePctBps };
}

/** Convert rupee Decimal/number to integer paise (half-up). */
export function rupeesToPaise(rupees: number | string): bigint {
  const n = typeof rupees === "string" ? Number(rupees) : rupees;
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("invalid rupee amount");
  }
  return BigInt(Math.round(n * 100));
}
