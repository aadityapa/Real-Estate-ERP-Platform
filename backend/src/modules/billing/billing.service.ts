import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash } from "crypto";
import {
  BillingCycle,
  PlanType,
  Prisma,
  SubStatus,
} from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { TenantContext } from "../../common/tenant/tenant-context";
import {
  PLAN_LIMIT_DEFAULTS,
  listPlanCatalog,
  mrrPaiseFor,
} from "../../common/limits/plan-defaults";
import { TenantLimitsService } from "../../common/limits/tenant-limits.service";
import { TenantUsageService } from "../../common/limits/tenant-usage.service";
import { BillingAnalyticsService } from "./billing-analytics.service";
import {
  SUBSCRIPTION_GATEWAY,
  type SubscriptionGateway,
} from "./gateway/subscription-gateway.interface";
import { RazorpaySubscriptionGateway } from "./gateway/razorpay-subscription.gateway";
import type {
  CancelSubscriptionDto,
  ChangePlanDto,
  StartSubscriptionDto,
} from "./dto/billing.dto";
import { GstInvoiceService } from "../finance/gst/gst-invoice.service";
import { stateCodeFromGstin } from "../finance/gst/tax-compute";

const MAX_DUNNING_ATTEMPTS = 3;

type RazorpaySubWebhook = {
  event?: string;
  id?: string;
  payload?: {
    subscription?: {
      entity?: {
        id?: string;
        status?: string;
        plan_id?: string;
        current_start?: number;
        current_end?: number;
        ended_at?: number;
        notes?: Record<string, string>;
      };
    };
    payment?: {
      entity?: {
        id?: string;
        amount?: number;
        status?: string;
      };
    };
    invoice?: {
      entity?: {
        id?: string;
        amount?: number;
        status?: string;
        billing_start?: number;
        billing_end?: number;
      };
    };
  };
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
    private readonly limits: TenantLimitsService,
    private readonly usage: TenantUsageService,
    private readonly analytics: BillingAnalyticsService,
    @Inject(SUBSCRIPTION_GATEWAY)
    private readonly gateway: SubscriptionGateway,
    @Optional() private readonly gstInvoices?: GstInvoiceService,
  ) {}

  listPlans() {
    return listPlanCatalog().map(({ plan, entitlements }) => ({
      plan,
      priceMonthlyPaise: entitlements.priceMonthlyPaise,
      priceYearlyPaise: entitlements.priceYearlyPaise,
      trialDays: entitlements.trialDays,
      limits: {
        apiRateLimitRpm: entitlements.apiRateLimitRpm,
        maxSeats: entitlements.maxSeats,
        maxProjects: entitlements.maxProjects,
        maxStorageBytes: entitlements.maxStorageBytes,
        queueConcurrency: entitlements.queueConcurrency,
      },
      features: entitlements.features,
    }));
  }

  async getSubscription(tenantId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ["TRIAL", "ACTIVE", "PAST_DUE", "HALTED"] },
      },
      orderBy: { createdAt: "desc" },
      include: {
        invoices: {
          orderBy: { createdAt: "desc" },
          take: 12,
        },
      },
    });
    const snapshot = await this.limits.getEffectiveLimits(tenantId);
    const usage = await this.usage.getUsage(tenantId);

    this.analytics.emit({
      type: "billing.usage_snapshot",
      tenantId,
      plan: snapshot.plan,
      seats: usage.seats,
      projects: usage.projects,
      storageBytes: usage.storageBytes,
      mrrPaise: (sub?.mrrPaise ?? 0n).toString(),
    });

    return {
      tenantPlan: snapshot.plan,
      entitlements: snapshot.limits,
      usage,
      subscription: sub ? serializeSubscription(sub) : null,
    };
  }

  async startSubscription(tenantId: string, dto: StartSubscriptionDto) {
    const existing = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ["TRIAL", "ACTIVE", "PAST_DUE"] },
      },
    });
    if (existing) {
      throw new BadRequestException(
        "Tenant already has an active or trial subscription — use change-plan or cancel",
      );
    }

    const catalog = PLAN_LIMIT_DEFAULTS[dto.plan];
    const amountPaise = BigInt(
      dto.billingCycle === "YEARLY"
        ? catalog.priceYearlyPaise
        : catalog.priceMonthlyPaise,
    );
    const mrrPaise = BigInt(mrrPaiseFor(dto.plan, dto.billingCycle));
    const startTrial =
      dto.startTrial !== false && catalog.trialDays > 0;
    const trialEndsAt = startTrial
      ? new Date(Date.now() + catalog.trialDays * 86400_000)
      : null;

    const providerPlanId = await this.resolveProviderPlanId(
      dto.plan,
      dto.billingCycle,
    );

    const remote = await this.gateway.createSubscription({
      providerPlanId,
      trialDays: startTrial ? catalog.trialDays : 0,
      notes: {
        tenantId,
        plan: dto.plan,
        billingCycle: dto.billingCycle,
      },
    });

    const status: SubStatus = startTrial ? "TRIAL" : "ACTIVE";
    const sub = await this.prisma.subscription.create({
      data: {
        tenantId,
        plan: dto.plan,
        status,
        billingCycle: dto.billingCycle as BillingCycle,
        amountPaise,
        mrrPaise,
        provider: "RAZORPAY",
        providerSubscriptionId: remote.subscriptionId,
        providerPlanId,
        trialEndsAt,
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEndsAt,
      },
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { plan: dto.plan },
    });

    if (startTrial && trialEndsAt) {
      this.analytics.emit({
        type: "billing.trial_started",
        tenantId,
        plan: dto.plan,
        trialEndsAt: trialEndsAt.toISOString(),
      });
    } else {
      this.analytics.emit({
        type: "billing.subscription_activated",
        tenantId,
        plan: dto.plan,
        mrrPaise: mrrPaise.toString(),
      });
    }

    this.analytics.emit({
      type: "billing.mrr_changed",
      tenantId,
      plan: dto.plan,
      previousMrrPaise: "0",
      mrrPaise: mrrPaise.toString(),
      reason: startTrial ? "trial_start" : "subscribe",
    });

    return {
      subscription: serializeSubscription(sub),
      checkout: {
        providerSubscriptionId: remote.subscriptionId,
        status: remote.status,
        shortUrl: remote.shortUrl ?? null,
      },
    };
  }

  async changePlan(tenantId: string, dto: ChangePlanDto) {
    const sub = await this.requireLiveSubscription(tenantId);
    const billingCycle = (dto.billingCycle ??
      sub.billingCycle) as "MONTHLY" | "YEARLY";
    const previousMrr = sub.mrrPaise;
    const catalog = PLAN_LIMIT_DEFAULTS[dto.plan];
    const amountPaise = BigInt(
      billingCycle === "YEARLY"
        ? catalog.priceYearlyPaise
        : catalog.priceMonthlyPaise,
    );
    const mrrPaise = BigInt(mrrPaiseFor(dto.plan, billingCycle));
    const providerPlanId = await this.resolveProviderPlanId(
      dto.plan,
      billingCycle,
    );

    if (sub.providerSubscriptionId) {
      await this.gateway.updateSubscription({
        providerSubscriptionId: sub.providerSubscriptionId,
        providerPlanId,
        scheduleChangeAt: dto.scheduleChangeAt ?? "now",
        notes: {
          tenantId,
          plan: dto.plan,
          billingCycle,
        },
      });
    }

    const updated = await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        plan: dto.plan,
        billingCycle: billingCycle as BillingCycle,
        amountPaise,
        mrrPaise,
        providerPlanId,
        status: sub.status === "TRIAL" ? "TRIAL" : "ACTIVE",
        dunningStatus: "NONE",
        dunningAttempts: 0,
      },
    });

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { plan: dto.plan },
    });

    this.analytics.emit({
      type: "billing.mrr_changed",
      tenantId,
      plan: dto.plan,
      previousMrrPaise: previousMrr.toString(),
      mrrPaise: mrrPaise.toString(),
      reason: "plan_change",
    });

    return { subscription: serializeSubscription(updated) };
  }

  async cancel(tenantId: string, dto: CancelSubscriptionDto) {
    const sub = await this.requireLiveSubscription(tenantId);
    const cancelAtPeriodEnd = dto.cancelAtPeriodEnd !== false;

    if (sub.providerSubscriptionId) {
      await this.gateway.cancelSubscription({
        providerSubscriptionId: sub.providerSubscriptionId,
        cancelAtCycleEnd: cancelAtPeriodEnd,
      });
    }

    const updated = await this.prisma.subscription.update({
      where: { id: sub.id },
      data: cancelAtPeriodEnd
        ? { cancelAtPeriodEnd: true }
        : {
            status: "CANCELLED",
            cancelAtPeriodEnd: false,
            cancelledAt: new Date(),
            endDate: new Date(),
            mrrPaise: 0n,
          },
    });

    if (!cancelAtPeriodEnd) {
      this.analytics.emit({
        type: "billing.churn",
        tenantId,
        plan: sub.plan,
        mrrPaiseLost: sub.mrrPaise.toString(),
        reason: "cancel_immediate",
      });
      this.analytics.emit({
        type: "billing.mrr_changed",
        tenantId,
        plan: sub.plan,
        previousMrrPaise: sub.mrrPaise.toString(),
        mrrPaise: "0",
        reason: "cancel_immediate",
      });
    }

    return { subscription: serializeSubscription(updated) };
  }

  async listInvoices(tenantId: string) {
    const invoices = await this.prisma.saasInvoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return invoices.map(serializeInvoice);
  }

  async handleWebhook(rawBody: string, signature: string | undefined) {
    if (!signature || !this.gateway.verifyWebhookSignature(rawBody, signature)) {
      throw new UnauthorizedException("Invalid Razorpay webhook signature");
    }

    return this.tenantContext.runAsSystem(async () => {
      const payload = JSON.parse(rawBody) as RazorpaySubWebhook;
      const eventType = payload.event ?? "unknown";
      const eventId =
        payload.id ??
        `${eventType}:${payload.payload?.subscription?.entity?.id ?? "na"}:${createHash("sha256").update(rawBody).digest("hex").slice(0, 16)}`;
      const payloadHash = createHash("sha256").update(rawBody).digest("hex");

      const existing = await this.prisma.gatewayWebhookEvent.findUnique({
        where: {
          provider_eventId: { provider: "RAZORPAY", eventId },
        },
      });
      if (existing) {
        return { ok: true as const, status: "DUPLICATE" as const };
      }

      let tenantId: string | undefined;
      let processStatus: "PROCESSED" | "IGNORED" | "FAILED" = "PROCESSED";
      let error: string | undefined;

      try {
        const entity = payload.payload?.subscription?.entity;
        tenantId =
          entity?.notes?.["tenantId"] ??
          (await this.resolveTenantFromProviderSub(entity?.id));

        if (
          eventType === "subscription.activated" ||
          eventType === "subscription.charged"
        ) {
          if (!entity?.id || !tenantId) {
            processStatus = "IGNORED";
            error = "missing_subscription_or_tenant";
          } else {
            await this.onSubscriptionCharged({
              tenantId,
              providerSubscriptionId: entity.id,
              providerPlanId: entity.plan_id,
              currentStart: entity.current_start,
              currentEnd: entity.current_end,
              paymentId: payload.payload?.payment?.entity?.id,
              paymentAmountPaise: payload.payload?.payment?.entity?.amount,
              invoiceId: payload.payload?.invoice?.entity?.id,
              invoiceAmountPaise: payload.payload?.invoice?.entity?.amount,
              billingStart: payload.payload?.invoice?.entity?.billing_start,
              billingEnd: payload.payload?.invoice?.entity?.billing_end,
            });
          }
        } else if (
          eventType === "subscription.pending" ||
          eventType === "subscription.halted"
        ) {
          if (!entity?.id || !tenantId) {
            processStatus = "IGNORED";
            error = "missing_subscription_or_tenant";
          } else {
            await this.onDunning({
              tenantId,
              providerSubscriptionId: entity.id,
              halted: eventType === "subscription.halted",
            });
          }
        } else if (
          eventType === "subscription.cancelled" ||
          eventType === "subscription.completed"
        ) {
          if (!entity?.id || !tenantId) {
            processStatus = "IGNORED";
            error = "missing_subscription_or_tenant";
          } else {
            await this.onCancelled({
              tenantId,
              providerSubscriptionId: entity.id,
              reason: eventType,
            });
          }
        } else {
          processStatus = "IGNORED";
        }
      } catch (err) {
        processStatus = "FAILED";
        error = err instanceof Error ? err.message : "webhook_error";
        this.logger.warn({
          msg: "billing_webhook_handler_error",
          eventType,
          error,
        });
      }

      try {
        await this.prisma.gatewayWebhookEvent.create({
          data: {
            provider: "RAZORPAY",
            eventId,
            eventType,
            payloadHash,
            tenantId: tenantId ?? null,
            status: processStatus,
            error: error ?? null,
          },
        });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          return { ok: true as const, status: "DUPLICATE" as const };
        }
        throw err;
      }

      return { ok: true as const, status: processStatus };
    });
  }

  private async onSubscriptionCharged(args: {
    tenantId: string;
    providerSubscriptionId: string;
    providerPlanId?: string;
    currentStart?: number;
    currentEnd?: number;
    paymentId?: string;
    paymentAmountPaise?: number;
    invoiceId?: string;
    invoiceAmountPaise?: number;
    billingStart?: number;
    billingEnd?: number;
  }) {
    const sub = await this.prisma.subscription.findFirst({
      where: {
        tenantId: args.tenantId,
        providerSubscriptionId: args.providerSubscriptionId,
      },
    });
    if (!sub) return;

    const wasTrial = sub.status === "TRIAL";
    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: "ACTIVE",
        dunningStatus: "NONE",
        dunningAttempts: 0,
        lastPaymentAt: new Date(),
        nextRetryAt: null,
        currentPeriodStart: args.currentStart
          ? new Date(args.currentStart * 1000)
          : sub.currentPeriodStart,
        currentPeriodEnd: args.currentEnd
          ? new Date(args.currentEnd * 1000)
          : sub.currentPeriodEnd,
        ...(args.providerPlanId
          ? { providerPlanId: args.providerPlanId }
          : {}),
      },
    });

    await this.prisma.tenant.update({
      where: { id: args.tenantId },
      data: { plan: sub.plan },
    });

    const amountPaise = BigInt(
      args.invoiceAmountPaise ??
        args.paymentAmountPaise ??
        Number(sub.amountPaise),
    );
    const periodStart = args.billingStart
      ? new Date(args.billingStart * 1000)
      : (sub.currentPeriodStart ?? new Date());
    const periodEnd = args.billingEnd
      ? new Date(args.billingEnd * 1000)
      : (sub.currentPeriodEnd ?? new Date());

    if (args.invoiceId || args.paymentId) {
      const invoiceNumber = await this.nextInvoiceNumber(args.tenantId);
      try {
        const saasInv = await this.prisma.saasInvoice.create({
          data: {
            tenantId: args.tenantId,
            subscriptionId: sub.id,
            invoiceNumber,
            amountPaise,
            status: "PAID",
            periodStart,
            periodEnd,
            providerInvoiceId: args.invoiceId ?? null,
            providerPaymentId: args.paymentId ?? null,
            taxNote: "GST via linked GSTInvoice (Phase 6.1)",
            paidAt: new Date(),
          },
        });
        await this.maybeCreateGstForSaasInvoice({
          tenantId: args.tenantId,
          saasInvoiceId: saasInv.id,
          saasInvoiceNumber: invoiceNumber,
          amountPaise,
        });
      } catch (err) {
        if (
          !(
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === "P2002"
          )
        ) {
          throw err;
        }
      }
    }

    if (wasTrial) {
      this.analytics.emit({
        type: "billing.subscription_activated",
        tenantId: args.tenantId,
        plan: sub.plan,
        mrrPaise: sub.mrrPaise.toString(),
      });
    }
  }

  private async onDunning(args: {
    tenantId: string;
    providerSubscriptionId: string;
    halted: boolean;
  }) {
    const sub = await this.prisma.subscription.findFirst({
      where: {
        tenantId: args.tenantId,
        providerSubscriptionId: args.providerSubscriptionId,
      },
    });
    if (!sub) return;

    const attempts = sub.dunningAttempts + 1;
    const halted = args.halted || attempts >= MAX_DUNNING_ATTEMPTS;
    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: halted ? "HALTED" : "PAST_DUE",
        dunningStatus: halted ? "EXHAUSTED" : "RETRYING",
        dunningAttempts: attempts,
        nextRetryAt: halted
          ? null
          : new Date(Date.now() + 2 * 86400_000),
      },
    });
  }

  private async onCancelled(args: {
    tenantId: string;
    providerSubscriptionId: string;
    reason: string;
  }) {
    const sub = await this.prisma.subscription.findFirst({
      where: {
        tenantId: args.tenantId,
        providerSubscriptionId: args.providerSubscriptionId,
      },
    });
    if (!sub) return;
    if (sub.status === "CANCELLED" || sub.status === "EXPIRED") return;

    const previousMrr = sub.mrrPaise;
    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        endDate: new Date(),
        cancelAtPeriodEnd: false,
        mrrPaise: 0n,
      },
    });

    this.analytics.emit({
      type: "billing.churn",
      tenantId: args.tenantId,
      plan: sub.plan,
      mrrPaiseLost: previousMrr.toString(),
      reason: args.reason,
    });
    this.analytics.emit({
      type: "billing.mrr_changed",
      tenantId: args.tenantId,
      plan: sub.plan,
      previousMrrPaise: previousMrr.toString(),
      mrrPaise: "0",
      reason: args.reason,
    });
  }

  private async resolveProviderPlanId(
    plan: PlanType,
    cycle: "MONTHLY" | "YEARLY",
  ): Promise<string> {
    if (this.gateway instanceof RazorpaySubscriptionGateway) {
      const envId = this.gateway.resolveEnvPlanId(plan, cycle);
      if (envId) return envId;
    }

    const catalog = PLAN_LIMIT_DEFAULTS[plan];
    const amountPaise = BigInt(
      cycle === "YEARLY"
        ? catalog.priceYearlyPaise
        : catalog.priceMonthlyPaise,
    );
    const created = await this.gateway.createPlan({
      name: `PropOS ${plan} ${cycle}`,
      amountPaise,
      currency: "INR",
      period: cycle === "YEARLY" ? "yearly" : "monthly",
    });
    return created.planId;
  }

  private async requireLiveSubscription(tenantId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        status: { in: ["TRIAL", "ACTIVE", "PAST_DUE", "HALTED"] },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!sub) throw new NotFoundException("No active subscription");
    return sub;
  }

  private async resolveTenantFromProviderSub(
    providerSubscriptionId: string | undefined,
  ): Promise<string | undefined> {
    if (!providerSubscriptionId) return undefined;
    const sub = await this.prisma.subscription.findUnique({
      where: { providerSubscriptionId },
      select: { tenantId: true },
    });
    return sub?.tenantId;
  }

  private async nextInvoiceNumber(tenantId: string): Promise<string> {
    const count = await this.prisma.saasInvoice.count({ where: { tenantId } });
    const seq = String(count + 1).padStart(5, "0");
    const y = new Date().getFullYear();
    return `PROPOS-${y}-${tenantId.slice(-6).toUpperCase()}-${seq}`;
  }

  /**
   * Attach a GST tax invoice (and optional mock IRN) to a paid SaaS invoice.
   * Supplier GSTIN from PROPOS_SUPPLIER_GSTIN; buyer from tenant company.
   */
  private async maybeCreateGstForSaasInvoice(args: {
    tenantId: string;
    saasInvoiceId: string;
    saasInvoiceNumber: string;
    amountPaise: bigint;
  }) {
    if (!this.gstInvoices) return;
    const supplierGstin = process.env["PROPOS_SUPPLIER_GSTIN"]?.trim();
    if (!supplierGstin) {
      this.logger.debug(
        "PROPOS_SUPPLIER_GSTIN unset — skipping SaaS GST invoice",
      );
      return;
    }
    try {
      const company = await this.prisma.company.findFirst({
        where: { tenantId: args.tenantId, status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
      });
      const buyerState =
        company?.stateCode ??
        (company?.gstin ? stateCodeFromGstin(company.gstin) : null) ??
        process.env["PROPOS_DEFAULT_BUYER_STATE"] ??
        stateCodeFromGstin(supplierGstin);

      await this.gstInvoices.createFromSaasInvoice({
        tenantId: args.tenantId,
        saasInvoiceId: args.saasInvoiceId,
        saasInvoiceNumber: args.saasInvoiceNumber,
        amountPaise: args.amountPaise,
        supplierGstin,
        supplierStateCode:
          process.env["PROPOS_SUPPLIER_STATE_CODE"] ??
          stateCodeFromGstin(supplierGstin),
        buyerGstin: company?.gstin,
        buyerStateCode: buyerState,
        buyerName: company?.name,
        companyId: company?.id,
        requestEInvoice:
          (process.env["GST_AUTO_EINVOICE"] ?? "true").toLowerCase() === "true",
      });
    } catch (err) {
      this.logger.warn(
        `GST invoice for SaaS ${args.saasInvoiceId} failed: ${
          err instanceof Error ? err.message : "unknown"
        }`,
      );
    }
  }
}

function serializeSubscription(sub: {
  id: string;
  tenantId: string;
  plan: PlanType;
  status: SubStatus;
  billingCycle: BillingCycle;
  amountPaise: bigint;
  mrrPaise: bigint;
  currency: string;
  providerSubscriptionId: string | null;
  providerPlanId: string | null;
  startDate: Date;
  endDate: Date | null;
  trialEndsAt: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: Date | null;
  dunningStatus: string;
  dunningAttempts: number;
  lastPaymentAt: Date | null;
  nextRetryAt: Date | null;
  invoices?: unknown[];
}) {
  return {
    id: sub.id,
    tenantId: sub.tenantId,
    plan: sub.plan,
    status: sub.status,
    billingCycle: sub.billingCycle,
    amountPaise: sub.amountPaise.toString(),
    mrrPaise: sub.mrrPaise.toString(),
    currency: sub.currency,
    providerSubscriptionId: sub.providerSubscriptionId,
    providerPlanId: sub.providerPlanId,
    startDate: sub.startDate,
    endDate: sub.endDate,
    trialEndsAt: sub.trialEndsAt,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    cancelledAt: sub.cancelledAt,
    dunningStatus: sub.dunningStatus,
    dunningAttempts: sub.dunningAttempts,
    lastPaymentAt: sub.lastPaymentAt,
    nextRetryAt: sub.nextRetryAt,
    invoices: Array.isArray(sub.invoices)
      ? sub.invoices.map((inv) =>
          serializeInvoice(inv as Parameters<typeof serializeInvoice>[0]),
        )
      : undefined,
  };
}

function serializeInvoice(inv: {
  id: string;
  tenantId: string;
  subscriptionId: string;
  invoiceNumber: string;
  amountPaise: bigint;
  currency: string;
  status: string;
  periodStart: Date;
  periodEnd: Date;
  providerInvoiceId: string | null;
  providerPaymentId: string | null;
  taxNote: string | null;
  paidAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: inv.id,
    tenantId: inv.tenantId,
    subscriptionId: inv.subscriptionId,
    invoiceNumber: inv.invoiceNumber,
    amountPaise: inv.amountPaise.toString(),
    currency: inv.currency,
    status: inv.status,
    periodStart: inv.periodStart,
    periodEnd: inv.periodEnd,
    providerInvoiceId: inv.providerInvoiceId,
    providerPaymentId: inv.providerPaymentId,
    taxNote: inv.taxNote,
    paidAt: inv.paidAt,
    createdAt: inv.createdAt,
  };
}
