/**
 * Money helpers for gateway amounts.
 * PropOS installment `Payment.amount` is Decimal rupees (legacy);
 * Razorpay and GatewayPayment use integer paise (BIGINT).
 */

export function rupeesToPaise(rupees: number | string | { toString(): string }): bigint {
  const n = Number(rupees);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("Invalid rupee amount");
  }
  return BigInt(Math.round(n * 100));
}

export function paiseToRupeesNumber(paise: bigint): number {
  return Number(paise) / 100;
}

/** Validate a positive integer paise amount from DTO input. */
export function assertPositivePaise(paise: number | bigint): bigint {
  const value = typeof paise === "bigint" ? paise : BigInt(Math.trunc(paise));
  if (value <= 0n) {
    throw new Error("amountPaise must be a positive integer");
  }
  return value;
}
