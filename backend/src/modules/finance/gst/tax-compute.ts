/**
 * GST tax computation (INR, integer paise).
 * Intra-state (same supplier/buyer state): CGST + SGST.
 * Inter-state: IGST only.
 */

export type GstSplit = {
  taxablePaise: bigint;
  cgstPaise: bigint;
  sgstPaise: bigint;
  igstPaise: bigint;
  totalGstPaise: bigint;
  totalPaise: bigint;
  isInterState: boolean;
};

export type LineInput = {
  taxablePaise: bigint;
  /** GST rate in basis points (1800 = 18%). */
  gstRateBps: number;
};

/** Normalize 2-digit GST state code from GSTIN or raw code. */
export function stateCodeFromGstin(gstin: string): string {
  const g = gstin.trim().toUpperCase();
  if (g.length < 2) {
    throw new Error("Invalid GSTIN: need state code prefix");
  }
  return g.slice(0, 2);
}

export function normalizeStateCode(code: string): string {
  const c = code.trim();
  if (!/^\d{1,2}$/.test(c)) {
    throw new Error(`Invalid state code: ${code}`);
  }
  return c.padStart(2, "0");
}

/** Indian financial year label for a date (Apr–Mar), e.g. "2025-26". */
export function indianFiscalYear(date: Date): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth(); // 0-based
  if (m >= 3) {
    return `${y}-${String(y + 1).slice(-2)}`;
  }
  return `${y - 1}-${String(y).slice(-2)}`;
}

/** Q1=Apr–Jun … Q4=Jan–Mar of Indian FY. */
export function indianFiscalQuarter(date: Date): "Q1" | "Q2" | "Q3" | "Q4" {
  const m = date.getUTCMonth();
  if (m >= 3 && m <= 5) return "Q1";
  if (m >= 6 && m <= 8) return "Q2";
  if (m >= 9 && m <= 11) return "Q3";
  return "Q4";
}

function gstOnTaxable(taxablePaise: bigint, gstRateBps: number): bigint {
  if (gstRateBps < 0 || !Number.isInteger(gstRateBps)) {
    throw new Error("gstRateBps must be a non-negative integer");
  }
  if (taxablePaise < 0n) {
    throw new Error("taxablePaise must be non-negative");
  }
  // Round half-up to nearest paise
  return (taxablePaise * BigInt(gstRateBps) + 5000n) / 10000n;
}

/**
 * Split taxable amount into CGST/SGST or IGST by place of supply vs supplier state.
 */
export function computeGstSplit(args: {
  taxablePaise: bigint;
  gstRateBps: number;
  supplierStateCode: string;
  placeOfSupply: string;
}): GstSplit {
  const supplier = normalizeStateCode(args.supplierStateCode);
  const pos = normalizeStateCode(args.placeOfSupply);
  const isInterState = supplier !== pos;
  const totalGst = gstOnTaxable(args.taxablePaise, args.gstRateBps);

  if (isInterState) {
    return {
      taxablePaise: args.taxablePaise,
      cgstPaise: 0n,
      sgstPaise: 0n,
      igstPaise: totalGst,
      totalGstPaise: totalGst,
      totalPaise: args.taxablePaise + totalGst,
      isInterState: true,
    };
  }

  // Equal CGST/SGST; odd paise goes to CGST
  const half = totalGst / 2n;
  const cgst = totalGst - half;
  const sgst = half;
  return {
    taxablePaise: args.taxablePaise,
    cgstPaise: cgst,
    sgstPaise: sgst,
    igstPaise: 0n,
    totalGstPaise: totalGst,
    totalPaise: args.taxablePaise + totalGst,
    isInterState: false,
  };
}

/** Aggregate line items (each may have its own rate) into one invoice split. */
export function computeInvoiceGst(args: {
  lines: LineInput[];
  supplierStateCode: string;
  placeOfSupply: string;
}): GstSplit & { lines: Array<LineInput & GstSplit> } {
  const supplier = normalizeStateCode(args.supplierStateCode);
  const pos = normalizeStateCode(args.placeOfSupply);
  const isInterState = supplier !== pos;

  let taxable = 0n;
  let cgst = 0n;
  let sgst = 0n;
  let igst = 0n;
  const lines = args.lines.map((line) => {
    const split = computeGstSplit({
      taxablePaise: line.taxablePaise,
      gstRateBps: line.gstRateBps,
      supplierStateCode: supplier,
      placeOfSupply: pos,
    });
    taxable += split.taxablePaise;
    cgst += split.cgstPaise;
    sgst += split.sgstPaise;
    igst += split.igstPaise;
    return { ...line, ...split };
  });

  const totalGst = cgst + sgst + igst;
  return {
    taxablePaise: taxable,
    cgstPaise: cgst,
    sgstPaise: sgst,
    igstPaise: igst,
    totalGstPaise: totalGst,
    totalPaise: taxable + totalGst,
    isInterState,
    lines,
  };
}

/**
 * Given a GST-inclusive gross (e.g. SaaS subscription charge), back out taxable
 * at a uniform rate.
 */
export function taxableFromGrossInclusive(
  grossPaise: bigint,
  gstRateBps: number,
): bigint {
  if (grossPaise < 0n) throw new Error("grossPaise must be non-negative");
  const denom = 10000n + BigInt(gstRateBps);
  return (grossPaise * 10000n) / denom;
}

/** TDS amount = payment × rateBps / 10000 (half-up). */
export function computeTdsAmount(
  paymentAmountPaise: bigint,
  tdsRateBps: number,
): { tdsAmountPaise: bigint; netPayablePaise: bigint } {
  if (paymentAmountPaise < 0n) {
    throw new Error("paymentAmountPaise must be non-negative");
  }
  if (tdsRateBps < 0 || !Number.isInteger(tdsRateBps)) {
    throw new Error("tdsRateBps must be a non-negative integer");
  }
  const tds = (paymentAmountPaise * BigInt(tdsRateBps) + 5000n) / 10000n;
  return {
    tdsAmountPaise: tds,
    netPayablePaise: paymentAmountPaise - tds,
  };
}

/** Default SAC for SaaS / OIDAR software subscription. */
export const SAAS_SAC = "998314";
/** Default GST rate for SaaS (18%). */
export const SAAS_GST_RATE_BPS = 1800;
