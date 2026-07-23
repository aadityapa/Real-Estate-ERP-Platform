import { paiseToRupeesNumber, rupeesToPaise, assertPositivePaise } from "./money";

describe("gateway money helpers", () => {
  it("converts rupees to integer paise without float drift for whole rupees", () => {
    expect(rupeesToPaise(4500000)).toBe(450_000_000n);
    expect(rupeesToPaise("100.50")).toBe(10050n);
  });

  it("converts paise back to rupees number", () => {
    expect(paiseToRupeesNumber(10050n)).toBe(100.5);
  });

  it("rejects non-positive paise", () => {
    expect(() => assertPositivePaise(0)).toThrow(/positive/);
    expect(() => assertPositivePaise(-1)).toThrow(/positive/);
    expect(assertPositivePaise(1)).toBe(1n);
  });
});
