export const PAYMENT_GATEWAY = Symbol("PAYMENT_GATEWAY");

export type GatewayProviderName = "RAZORPAY";

export interface CreateGatewayOrderInput {
  amountPaise: bigint;
  currency: string;
  /** Gateway receipt / reference (max ~40 chars for Razorpay). */
  receipt: string;
  /** Non-PII correlation fields (tenantId, bookingId, paymentId, …). */
  notes?: Record<string, string>;
}

export interface CreateGatewayOrderResult {
  orderId: string;
  amountPaise: bigint;
  currency: string;
  status: string;
}

export interface VerifyCheckoutSignatureInput {
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface CreateGatewayRefundInput {
  providerPaymentId: string;
  amountPaise: bigint;
  notes?: Record<string, string>;
}

export interface CreateGatewayRefundResult {
  refundId: string;
  amountPaise: bigint;
  status: string;
}

/**
 * Pluggable payment provider (Razorpay now; PayU/Stripe later).
 * Implementations must never log card/UPI/PAN or full signatures.
 */
export interface PaymentGateway {
  readonly provider: GatewayProviderName;

  createOrder(input: CreateGatewayOrderInput): Promise<CreateGatewayOrderResult>;

  verifyCheckoutSignature(input: VerifyCheckoutSignatureInput): boolean;

  /** HMAC over the raw webhook body. */
  verifyWebhookSignature(rawBody: string, signature: string): boolean;

  createRefund(input: CreateGatewayRefundInput): Promise<CreateGatewayRefundResult>;
}
