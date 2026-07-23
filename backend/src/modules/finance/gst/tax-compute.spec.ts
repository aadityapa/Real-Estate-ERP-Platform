import {
  computeGstSplit,
  computeInvoiceGst,
  computeTdsAmount,
  indianFiscalQuarter,
  indianFiscalYear,
  stateCodeFromGstin,
  taxableFromGrossInclusive,
} from "./tax-compute";

describe("GST tax compute", () => {
  it("splits CGST+SGST for intra-state (MH→MH)", () => {
    const split = computeGstSplit({
      taxablePaise: 100_00n, // ₹100
      gstRateBps: 1800,
      supplierStateCode: "27",
      placeOfSupply: "27",
    });
    expect(split.isInterState).toBe(false);
    expect(split.totalGstPaise).toBe(18_00n);
    expect(split.cgstPaise).toBe(9_00n);
    expect(split.sgstPaise).toBe(9_00n);
    expect(split.igstPaise).toBe(0n);
    expect(split.totalPaise).toBe(118_00n);
  });

  it("uses IGST only for inter-state (MH→KA)", () => {
    const split = computeGstSplit({
      taxablePaise: 100_00n,
      gstRateBps: 1800,
      supplierStateCode: "27",
      placeOfSupply: "29",
    });
    expect(split.isInterState).toBe(true);
    expect(split.igstPaise).toBe(18_00n);
    expect(split.cgstPaise).toBe(0n);
    expect(split.sgstPaise).toBe(0n);
    expect(split.totalPaise).toBe(118_00n);
  });

  it("normalizes single-digit state codes", () => {
    const split = computeGstSplit({
      taxablePaise: 10_000n,
      gstRateBps: 500,
      supplierStateCode: "7",
      placeOfSupply: "07",
    });
    expect(split.isInterState).toBe(false);
    expect(split.totalGstPaise).toBe(500n);
  });

  it("aggregates multi-line invoice with mixed rates", () => {
    const inv = computeInvoiceGst({
      supplierStateCode: "27",
      placeOfSupply: "29",
      lines: [
        { taxablePaise: 100_00n, gstRateBps: 1800 },
        { taxablePaise: 50_00n, gstRateBps: 1200 },
      ],
    });
    expect(inv.isInterState).toBe(true);
    expect(inv.taxablePaise).toBe(150_00n);
    expect(inv.igstPaise).toBe(18_00n + 6_00n);
    expect(inv.cgstPaise).toBe(0n);
  });

  it("backs taxable out of GST-inclusive gross", () => {
    // 11800 inclusive @ 18% → taxable 10000
    expect(taxableFromGrossInclusive(118_00n, 1800)).toBe(100_00n);
  });

  it("derives state code from GSTIN", () => {
    expect(stateCodeFromGstin("27AABCS1429B1Z5")).toBe("27");
  });

  it("computes Indian FY and quarter", () => {
    expect(indianFiscalYear(new Date(Date.UTC(2025, 6, 15)))).toBe("2025-26");
    expect(indianFiscalYear(new Date(Date.UTC(2026, 1, 1)))).toBe("2025-26");
    expect(indianFiscalQuarter(new Date(Date.UTC(2025, 3, 1)))).toBe("Q1");
    expect(indianFiscalQuarter(new Date(Date.UTC(2026, 0, 10)))).toBe("Q4");
  });
});

describe("TDS compute", () => {
  it("computes 1% TDS (194IA) in paise", () => {
    const r = computeTdsAmount(50_00_000_00n, 100); // ₹50L @ 1%
    expect(r.tdsAmountPaise).toBe(50_00_000n);
    expect(r.netPayablePaise).toBe(49_50_00_000n);
  });

  it("computes 2% TDS (194C)", () => {
    const r = computeTdsAmount(1_00_000_00n, 200);
    expect(r.tdsAmountPaise).toBe(2_00_000n);
  });
});
