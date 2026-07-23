export const SUBSCRIPTION_GATEWAY = Symbol("SUBSCRIPTION_GATEWAY");

export type SubscriptionBillingCycle = "MONTHLY" | "YEARLY";

export interface CreateSubscriptionPlanInput {
  /** Internal catalog key e.g. GROWTH_MONTHLY */
  name: string;
  amountPaise: bigint;
  currency: string;
  period: "monthly" | "yearly";
}

export interface CreateSubscriptionPlanResult {
  planId: string;
}

export interface CreateSubscriptionInput {
  providerPlanId: string;
  /** Total billing cycles; 0 = until cancelled (Razorpay). */
  totalCount?: number;
  customerNotify?: boolean;
  /** Non-PII notes (tenantId, plan, billingCycle). */
  notes?: Record<string, string>;
  /** Trial days before first charge. */
  trialDays?: number;
}

export interface CreateSubscriptionResult {
  subscriptionId: string;
  status: string;
  shortUrl?: string;
}

export interface UpdateSubscriptionInput {
  providerSubscriptionId: string;
  providerPlanId: string;
  /** Immediate proration when upgrading. */
  scheduleChangeAt?: "now" | "cycle_end";
  notes?: Record<string, string>;
}

export interface UpdateSubscriptionResult {
  subscriptionId: string;
  status: string;
}

export interface CancelSubscriptionInput {
  providerSubscriptionId: string;
  cancelAtCycleEnd: boolean;
}

export interface CancelSubscriptionResult {
  subscriptionId: string;
  status: string;
}

/**
 * Pluggable SaaS subscription provider (Razorpay Subscriptions now; Stripe later).
 * Never log card/UPI/PAN or full signatures.
 */
export interface SubscriptionGateway {
  readonly provider: "RAZORPAY";

  createPlan(
    input: CreateSubscriptionPlanInput,
  ): Promise<CreateSubscriptionPlanResult>;

  createSubscription(
    input: CreateSubscriptionInput,
  ): Promise<CreateSubscriptionResult>;

  updateSubscription(
    input: UpdateSubscriptionInput,
  ): Promise<UpdateSubscriptionResult>;

  cancelSubscription(
    input: CancelSubscriptionInput,
  ): Promise<CancelSubscriptionResult>;

  verifyWebhookSignature(rawBody: string, signature: string): boolean;
}
