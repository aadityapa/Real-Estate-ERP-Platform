import { Injectable, Logger } from "@nestjs/common";
import type { PlanType } from "@prisma/client";

export type BillingAnalyticsEvent =
  | {
      type: "billing.usage_snapshot";
      tenantId: string;
      plan: PlanType;
      seats: number;
      projects: number;
      storageBytes: number;
      mrrPaise: string;
    }
  | {
      type: "billing.mrr_changed";
      tenantId: string;
      plan: PlanType;
      previousMrrPaise: string;
      mrrPaise: string;
      reason: string;
    }
  | {
      type: "billing.churn";
      tenantId: string;
      plan: PlanType;
      mrrPaiseLost: string;
      reason: string;
    }
  | {
      type: "billing.trial_started";
      tenantId: string;
      plan: PlanType;
      trialEndsAt: string;
    }
  | {
      type: "billing.subscription_activated";
      tenantId: string;
      plan: PlanType;
      mrrPaise: string;
    };

/**
 * Emits structured billing analytics events (usage / MRR / churn).
 * Sink is structured logs for now; wire to Segment/warehouse later.
 */
@Injectable()
export class BillingAnalyticsService {
  private readonly logger = new Logger(BillingAnalyticsService.name);
  private readonly recent: BillingAnalyticsEvent[] = [];

  emit(event: BillingAnalyticsEvent): void {
    this.recent.push(event);
    if (this.recent.length > 100) this.recent.shift();
    this.logger.log({ msg: "billing_analytics", ...event });
  }

  /** Test helper. */
  drainForTests(): BillingAnalyticsEvent[] {
    const copy = [...this.recent];
    this.recent.length = 0;
    return copy;
  }
}
