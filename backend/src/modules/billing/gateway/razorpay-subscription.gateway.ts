import { createHmac, timingSafeEqual } from "crypto";
import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import type {
  CancelSubscriptionInput,
  CancelSubscriptionResult,
  CreateSubscriptionInput,
  CreateSubscriptionPlanInput,
  CreateSubscriptionPlanResult,
  CreateSubscriptionResult,
  SubscriptionGateway,
  UpdateSubscriptionInput,
  UpdateSubscriptionResult,
} from "./subscription-gateway.interface";

const RAZORPAY_API = "https://api.razorpay.com/v1";

@Injectable()
export class RazorpaySubscriptionGateway implements SubscriptionGateway {
  readonly provider = "RAZORPAY" as const;
  private readonly logger = new Logger(RazorpaySubscriptionGateway.name);

  private keyId(): string {
    return process.env["RAZORPAY_KEY_ID"]?.trim() ?? "";
  }

  private keySecret(): string {
    return process.env["RAZORPAY_KEY_SECRET"]?.trim() ?? "";
  }

  private webhookSecret(): string {
    return (
      process.env["RAZORPAY_WEBHOOK_SECRET"]?.trim() || this.keySecret()
    );
  }

  private assertConfigured(): void {
    if (!this.keyId() || !this.keySecret()) {
      throw new ServiceUnavailableException(
        "Razorpay is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)",
      );
    }
  }

  private authHeader(): string {
    const token = Buffer.from(`${this.keyId()}:${this.keySecret()}`).toString(
      "base64",
    );
    return `Basic ${token}`;
  }

  /**
   * Resolve pre-created Razorpay plan id from env, or create via API.
   * Env keys: RAZORPAY_PLAN_STARTER_MONTHLY, …_YEARLY, GROWTH_*, ENTERPRISE_*.
   */
  resolveEnvPlanId(plan: string, cycle: "MONTHLY" | "YEARLY"): string | null {
    const key = `RAZORPAY_PLAN_${plan}_${cycle}`;
    const id = process.env[key]?.trim();
    return id || null;
  }

  async createPlan(
    input: CreateSubscriptionPlanInput,
  ): Promise<CreateSubscriptionPlanResult> {
    this.assertConfigured();
    const amount = Number(input.amountPaise);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new ServiceUnavailableException("Invalid plan amount");
    }

    const period = input.period === "yearly" ? "yearly" : "monthly";
    const res = await fetch(`${RAZORPAY_API}/plans`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        period,
        interval: 1,
        item: {
          name: input.name.slice(0, 255),
          amount,
          currency: input.currency || "INR",
        },
      }),
    });

    if (!res.ok) {
      this.logger.warn({
        msg: "razorpay_plan_create_failed",
        status: res.status,
      });
      throw new ServiceUnavailableException("Failed to create Razorpay plan");
    }

    const body = (await res.json()) as { id: string };
    return { planId: body.id };
  }

  async createSubscription(
    input: CreateSubscriptionInput,
  ): Promise<CreateSubscriptionResult> {
    this.assertConfigured();
    const payload: Record<string, unknown> = {
      plan_id: input.providerPlanId,
      total_count: input.totalCount ?? 120,
      customer_notify: input.customerNotify ?? 1,
      notes: input.notes ?? {},
    };
    if (input.trialDays && input.trialDays > 0) {
      const start = Math.floor(Date.now() / 1000) + input.trialDays * 86400;
      payload["start_at"] = start;
    }

    const res = await fetch(`${RAZORPAY_API}/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      this.logger.warn({
        msg: "razorpay_subscription_create_failed",
        status: res.status,
      });
      throw new ServiceUnavailableException(
        "Failed to create Razorpay subscription",
      );
    }

    const body = (await res.json()) as {
      id: string;
      status: string;
      short_url?: string;
    };
    return {
      subscriptionId: body.id,
      status: body.status,
      shortUrl: body.short_url,
    };
  }

  async updateSubscription(
    input: UpdateSubscriptionInput,
  ): Promise<UpdateSubscriptionResult> {
    this.assertConfigured();
    const res = await fetch(
      `${RAZORPAY_API}/subscriptions/${encodeURIComponent(input.providerSubscriptionId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: this.authHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan_id: input.providerPlanId,
          schedule_change_at:
            input.scheduleChangeAt === "cycle_end" ? "cycle_end" : "now",
          notes: input.notes ?? {},
        }),
      },
    );

    if (!res.ok) {
      this.logger.warn({
        msg: "razorpay_subscription_update_failed",
        status: res.status,
      });
      throw new ServiceUnavailableException(
        "Failed to update Razorpay subscription",
      );
    }

    const body = (await res.json()) as { id: string; status: string };
    return { subscriptionId: body.id, status: body.status };
  }

  async cancelSubscription(
    input: CancelSubscriptionInput,
  ): Promise<CancelSubscriptionResult> {
    this.assertConfigured();
    const res = await fetch(
      `${RAZORPAY_API}/subscriptions/${encodeURIComponent(input.providerSubscriptionId)}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: this.authHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cancel_at_cycle_end: input.cancelAtCycleEnd,
        }),
      },
    );

    if (!res.ok) {
      this.logger.warn({
        msg: "razorpay_subscription_cancel_failed",
        status: res.status,
      });
      throw new ServiceUnavailableException(
        "Failed to cancel Razorpay subscription",
      );
    }

    const body = (await res.json()) as { id: string; status: string };
    return { subscriptionId: body.id, status: body.status };
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const secret = this.webhookSecret();
    if (!secret) return false;
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    return equalHex(expected, signature);
  }
}

function equalHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "utf8");
    const bb = Buffer.from(b, "utf8");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}
