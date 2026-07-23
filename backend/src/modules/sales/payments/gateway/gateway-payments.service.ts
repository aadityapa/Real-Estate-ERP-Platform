import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../../database/prisma.service";
import { PdfService } from "../../../../common/services/pdf.service";
import { TenantContext } from "../../../../common/tenant/tenant-context";
import { EventsService } from "../../../events/events.service";
import {
  PAYMENT_GATEWAY,
  type PaymentGateway,
} from "./payment-gateway.interface";
import {
  assertPositivePaise,
  paiseToRupeesNumber,
  rupeesToPaise,
} from "./money";
import type {
  ConfirmGatewayPaymentDto,
  CreateGatewayOrderDto,
  RefundGatewayPaymentDto,
} from "./dto/gateway-payment.dto";

const LEDGER_BANK = "BANK-RAZORPAY";
const LEDGER_BANK_NAME = "Razorpay settlement";
const SYSTEM_ACTOR = "gateway:razorpay";

type RazorpayWebhookPayload = {
  event?: string;
  id?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        status?: string;
        currency?: string;
        notes?: Record<string, string>;
      };
    };
    refund?: {
      entity?: {
        id?: string;
        payment_id?: string;
        amount?: number;
        status?: string;
        notes?: Record<string, string>;
      };
    };
  };
};

@Injectable()
export class GatewayPaymentsService {
  private readonly logger = new Logger(GatewayPaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly eventsService: EventsService,
    private readonly tenantContext: TenantContext,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  async createOrder(tenantId: string, dto: CreateGatewayOrderDto) {
    const installment = await this.prisma.payment.findFirst({
      where: { id: dto.paymentId, booking: { lead: { tenantId } } },
      include: {
        booking: { include: { lead: true } },
      },
    });
    if (!installment) throw new NotFoundException("Payment installment not found");
    if (installment.status === "PAID") {
      throw new BadRequestException("Installment already paid");
    }

    const remainingPaise =
      rupeesToPaise(installment.amount) - rupeesToPaise(installment.paidAmount);
    if (remainingPaise <= 0n) {
      throw new BadRequestException("No remaining balance on installment");
    }

    const amountPaise = dto.amountPaise
      ? assertPositivePaise(dto.amountPaise)
      : remainingPaise;
    if (amountPaise > remainingPaise) {
      throw new BadRequestException(
        "amountPaise exceeds remaining installment balance",
      );
    }

    const receipt = `gp_${installment.id.slice(-12)}_${Date.now().toString(36)}`;
    const notes = {
      tenantId,
      bookingId: installment.bookingId,
      paymentId: installment.id,
    };

    const order = await this.gateway.createOrder({
      amountPaise,
      currency: "INR",
      receipt,
      notes,
    });

    const row = await this.prisma.gatewayPayment.create({
      data: {
        tenantId,
        bookingId: installment.bookingId,
        paymentId: installment.id,
        provider: "RAZORPAY",
        amountPaise,
        currency: "INR",
        status: "CREATED",
        providerOrderId: order.orderId,
        notes,
      },
    });

    return {
      gatewayPaymentId: row.id,
      provider: this.gateway.provider,
      orderId: order.orderId,
      amountPaise: amountPaise.toString(),
      currency: "INR",
      keyId: process.env["RAZORPAY_KEY_ID"] ?? null,
      paymentId: installment.id,
      bookingId: installment.bookingId,
    };
  }

  async confirmCheckout(tenantId: string, dto: ConfirmGatewayPaymentDto) {
    if (
      !this.gateway.verifyCheckoutSignature({
        orderId: dto.razorpayOrderId,
        paymentId: dto.razorpayPaymentId,
        signature: dto.razorpaySignature,
      })
    ) {
      throw new UnauthorizedException("Invalid payment signature");
    }

    return this.capturePayment({
      tenantId,
      providerOrderId: dto.razorpayOrderId,
      providerPaymentId: dto.razorpayPaymentId,
      source: "confirm",
    });
  }

  async handleWebhook(
    rawBody: string,
    signature: string | undefined,
  ): Promise<{ ok: true; status: string }> {
    if (!signature || !this.gateway.verifyWebhookSignature(rawBody, signature)) {
      throw new UnauthorizedException("Invalid webhook signature");
    }

    let payload: RazorpayWebhookPayload;
    try {
      payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
    } catch {
      throw new BadRequestException("Invalid webhook JSON");
    }

    const eventId = payload.id;
    const eventType = payload.event;
    if (!eventId || !eventType) {
      throw new BadRequestException("Missing webhook event id/type");
    }

    const payloadHash = createHash("sha256").update(rawBody).digest("hex");

    return this.tenantContext.runAsSystem(async () => {
      const existing = await this.prisma.gatewayWebhookEvent.findUnique({
        where: {
          provider_eventId: { provider: "RAZORPAY", eventId },
        },
      });
      if (existing) {
        return { ok: true as const, status: "DUPLICATE" };
      }

      let tenantId: string | undefined;
      let processStatus: "PROCESSED" | "IGNORED" | "FAILED" = "PROCESSED";
      let error: string | undefined;

      try {
        if (
          eventType === "payment.captured" ||
          eventType === "order.paid"
        ) {
          const entity = payload.payload?.payment?.entity;
          const orderId = entity?.order_id;
          const paymentId = entity?.id;
          tenantId =
            entity?.notes?.["tenantId"] ??
            (await this.resolveTenantFromOrder(orderId));
          if (!orderId || !paymentId || !tenantId) {
            processStatus = "IGNORED";
            error = "missing_order_or_tenant";
          } else {
            await this.capturePayment({
              tenantId,
              providerOrderId: orderId,
              providerPaymentId: paymentId,
              amountPaise:
                entity?.amount !== undefined
                  ? BigInt(entity.amount)
                  : undefined,
              source: "webhook",
            });
          }
        } else if (eventType === "payment.failed") {
          const entity = payload.payload?.payment?.entity;
          const orderId = entity?.order_id;
          tenantId =
            entity?.notes?.["tenantId"] ??
            (await this.resolveTenantFromOrder(orderId));
          if (orderId && tenantId) {
            await this.markFailed(tenantId, orderId);
          } else {
            processStatus = "IGNORED";
            error = "missing_order_or_tenant";
          }
        } else if (
          eventType === "refund.processed" ||
          eventType === "refund.created"
        ) {
          const entity = payload.payload?.refund?.entity;
          const providerPaymentId = entity?.payment_id;
          const refundId = entity?.id;
          const amount = entity?.amount;
          if (!providerPaymentId || !refundId || amount === undefined) {
            processStatus = "IGNORED";
            error = "missing_refund_fields";
          } else {
            const gp = await this.prisma.gatewayPayment.findFirst({
              where: { providerPaymentId },
            });
            tenantId = gp?.tenantId;
            if (!gp) {
              processStatus = "IGNORED";
              error = "unknown_payment";
            } else {
              await this.applyRefundRecord({
                tenantId: gp.tenantId,
                gatewayPaymentId: gp.id,
                providerRefundId: refundId,
                amountPaise: BigInt(amount),
                reason: "webhook",
              });
            }
          }
        } else {
          processStatus = "IGNORED";
        }
      } catch (err) {
        processStatus = "FAILED";
        error = err instanceof Error ? err.message : "webhook_error";
        this.logger.warn({
          msg: "razorpay_webhook_handler_error",
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
          return { ok: true as const, status: "DUPLICATE" };
        }
        throw err;
      }

      return { ok: true as const, status: processStatus };
    });
  }

  async refund(
    tenantId: string,
    gatewayPaymentId: string,
    dto: RefundGatewayPaymentDto,
  ) {
    const gp = await this.prisma.gatewayPayment.findFirst({
      where: { id: gatewayPaymentId, tenantId },
      include: { refunds: true },
    });
    if (!gp) throw new NotFoundException("Gateway payment not found");
    if (gp.status !== "CAPTURED" && gp.status !== "PARTIALLY_REFUNDED") {
      throw new BadRequestException("Only captured payments can be refunded");
    }
    if (!gp.providerPaymentId) {
      throw new BadRequestException("Missing provider payment id");
    }

    const refunded = gp.refunds
      .filter((r) => r.status === "PROCESSED")
      .reduce((sum, r) => sum + BigInt(r.amountPaise), 0n);
    const remaining = BigInt(gp.amountPaise) - refunded;
    if (remaining <= 0n) {
      throw new BadRequestException("Nothing left to refund");
    }

    const amountPaise = dto.amountPaise
      ? assertPositivePaise(dto.amountPaise)
      : remaining;
    if (amountPaise > remaining) {
      throw new BadRequestException("Refund exceeds captured net amount");
    }

    const result = await this.gateway.createRefund({
      providerPaymentId: gp.providerPaymentId,
      amountPaise,
      notes: { gatewayPaymentId: gp.id, tenantId },
    });

    return this.applyRefundRecord({
      tenantId,
      gatewayPaymentId: gp.id,
      providerRefundId: result.refundId,
      amountPaise,
      reason: dto.reason,
    });
  }

  async reconciliation(tenantId: string, from?: string, to?: string) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (from) createdAt.gte = new Date(from);
    if (to) createdAt.lte = new Date(to);

    const where: Prisma.GatewayPaymentWhereInput = {
      tenantId,
      status: { in: ["CAPTURED", "PARTIALLY_REFUNDED", "REFUNDED"] },
      ...(Object.keys(createdAt).length ? { createdAt } : {}),
    };

    const payments = await this.prisma.gatewayPayment.findMany({
      where,
      include: { refunds: { where: { status: "PROCESSED" } } },
    });

    let gatewayCapturedPaise = 0n;
    let gatewayRefundedPaise = 0n;
    for (const p of payments) {
      gatewayCapturedPaise += BigInt(p.amountPaise);
      for (const r of p.refunds) {
        gatewayRefundedPaise += BigInt(r.amountPaise);
      }
    }
    const gatewayNetPaise = gatewayCapturedPaise - gatewayRefundedPaise;

    const ledgerWhere: Prisma.LedgerEntryWhereInput = {
      tenantId,
      accountCode: LEDGER_BANK,
      ...(Object.keys(createdAt).length
        ? { entryDate: createdAt as Prisma.DateTimeFilter }
        : {}),
    };
    const ledgerRows = await this.prisma.ledgerEntry.findMany({
      where: ledgerWhere,
    });

    let ledgerCreditPaise = 0n;
    let ledgerDebitPaise = 0n;
    for (const row of ledgerRows) {
      const paise = rupeesToPaise(row.amount);
      if (row.entryType === "CREDIT") ledgerCreditPaise += paise;
      else ledgerDebitPaise += paise;
    }
    const ledgerNetPaise = ledgerCreditPaise - ledgerDebitPaise;

    return {
      from: from ?? null,
      to: to ?? null,
      currency: "INR",
      gateway: {
        capturedPaise: gatewayCapturedPaise.toString(),
        refundedPaise: gatewayRefundedPaise.toString(),
        netPaise: gatewayNetPaise.toString(),
        orderCount: payments.length,
      },
      ledger: {
        creditPaise: ledgerCreditPaise.toString(),
        debitPaise: ledgerDebitPaise.toString(),
        netPaise: ledgerNetPaise.toString(),
        entryCount: ledgerRows.length,
      },
      variancePaise: (gatewayNetPaise - ledgerNetPaise).toString(),
      balanced: gatewayNetPaise === ledgerNetPaise,
    };
  }

  private async resolveTenantFromOrder(
    orderId: string | undefined,
  ): Promise<string | undefined> {
    if (!orderId) return undefined;
    const gp = await this.prisma.gatewayPayment.findUnique({
      where: { providerOrderId: orderId },
      select: { tenantId: true },
    });
    return gp?.tenantId;
  }

  private async markFailed(tenantId: string, providerOrderId: string) {
    const gp = await this.prisma.gatewayPayment.findFirst({
      where: { tenantId, providerOrderId },
    });
    if (!gp) return;
    if (gp.status === "CAPTURED" || gp.status === "REFUNDED") return;
    await this.prisma.gatewayPayment.update({
      where: { id: gp.id },
      data: { status: "FAILED" },
    });
  }

  private async capturePayment(args: {
    tenantId: string;
    providerOrderId: string;
    providerPaymentId: string;
    amountPaise?: bigint;
    source: "confirm" | "webhook";
  }) {
    const gp = await this.prisma.gatewayPayment.findFirst({
      where: {
        tenantId: args.tenantId,
        providerOrderId: args.providerOrderId,
      },
      include: {
        payment: {
          include: {
            booking: { include: { customer: true, lead: true } },
          },
        },
      },
    });
    if (!gp) throw new NotFoundException("Gateway order not found");

    // Idempotent: already captured with same provider payment id
    if (
      gp.status === "CAPTURED" ||
      gp.status === "PARTIALLY_REFUNDED" ||
      gp.status === "REFUNDED"
    ) {
      if (
        gp.providerPaymentId &&
        gp.providerPaymentId !== args.providerPaymentId
      ) {
        throw new ConflictException("Order already linked to another payment");
      }
      return {
        gatewayPaymentId: gp.id,
        status: gp.status,
        idempotent: true,
        receiptId: gp.receiptId,
        ledgerEntryId: gp.ledgerEntryId,
      };
    }

    const amountPaise = args.amountPaise ?? BigInt(gp.amountPaise);
    if (amountPaise !== BigInt(gp.amountPaise)) {
      throw new BadRequestException("Captured amount does not match order");
    }

    const paidRupees = paiseToRupeesNumber(amountPaise);
    const paidDate = new Date();
    const receiptNumber = `RCP-RZ-${Date.now()}`;

    const result = await this.prisma.$transaction(async (tx) => {
      const receipt = await tx.receipt.create({
        data: {
          receiptNumber,
          bookingId: gp.bookingId,
          amount: paidRupees,
          paymentMode: "ONLINE",
          reference: args.providerPaymentId,
          date: paidDate,
        },
      });

      const pdf = await this.pdfService.generateReceipt({
        receiptNumber,
        bookingNumber: gp.payment.booking.bookingNumber,
        buyerName: `${gp.payment.booking.customer.firstName} ${gp.payment.booking.customer.lastName}`,
        amount: paidRupees,
        paymentMode: "ONLINE",
        reference: args.providerPaymentId,
        date: paidDate.toLocaleDateString("en-IN"),
        installmentName: gp.payment.installmentName,
      });

      await tx.receipt.update({
        where: { id: receipt.id },
        data: { pdfUrl: pdf.url, checksum: pdf.checksum },
      });

      const newPaidAmount = Number(gp.payment.paidAmount) + paidRupees;
      const totalDue = Number(gp.payment.amount);
      let status: "PENDING" | "PARTIAL" | "PAID" = "PARTIAL";
      if (newPaidAmount >= totalDue) status = "PAID";
      else if (newPaidAmount === 0) status = "PENDING";

      await tx.payment.update({
        where: { id: gp.paymentId },
        data: {
          paidAmount: newPaidAmount,
          paidDate,
          paymentMode: "ONLINE",
          reference: args.providerPaymentId,
          status,
          receiptId: receipt.id,
        },
      });

      const ledger = await tx.ledgerEntry.create({
        data: {
          tenantId: args.tenantId,
          accountCode: LEDGER_BANK,
          accountName: LEDGER_BANK_NAME,
          entryType: "CREDIT",
          amount: paidRupees,
          description: `Razorpay capture ${args.providerPaymentId}`,
          reference: gp.id,
          entryDate: paidDate,
          createdBy: SYSTEM_ACTOR,
        },
      });

      const updated = await tx.gatewayPayment.update({
        where: { id: gp.id },
        data: {
          status: "CAPTURED",
          providerPaymentId: args.providerPaymentId,
          receiptId: receipt.id,
          ledgerEntryId: ledger.id,
        },
      });

      return { updated, receiptId: receipt.id, ledgerEntryId: ledger.id };
    });

    this.eventsService.emitPaymentReceived(args.tenantId, {
      amount: paidRupees,
      bookingNumber: gp.payment.booking.bookingNumber,
    });

    this.logger.log({
      msg: "gateway_payment_captured",
      source: args.source,
      gatewayPaymentId: gp.id,
      // never log signature / card / UPI
    });

    return {
      gatewayPaymentId: result.updated.id,
      status: result.updated.status,
      idempotent: false,
      receiptId: result.receiptId,
      ledgerEntryId: result.ledgerEntryId,
    };
  }

  private async applyRefundRecord(args: {
    tenantId: string;
    gatewayPaymentId: string;
    providerRefundId: string;
    amountPaise: bigint;
    reason?: string;
  }) {
    const existing = await this.prisma.gatewayRefund.findUnique({
      where: { providerRefundId: args.providerRefundId },
    });
    if (existing) {
      return { refund: existing, idempotent: true };
    }

    const gp = await this.prisma.gatewayPayment.findFirst({
      where: { id: args.gatewayPaymentId, tenantId: args.tenantId },
      include: {
        payment: true,
        refunds: { where: { status: "PROCESSED" } },
      },
    });
    if (!gp) throw new NotFoundException("Gateway payment not found");

    const priorRefunded = gp.refunds.reduce(
      (sum, r) => sum + BigInt(r.amountPaise),
      0n,
    );
    const netAfter = priorRefunded + args.amountPaise;
    if (netAfter > BigInt(gp.amountPaise)) {
      throw new BadRequestException("Refund would exceed captured amount");
    }

    const refundRupees = paiseToRupeesNumber(args.amountPaise);
    const paidDate = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const ledger = await tx.ledgerEntry.create({
        data: {
          tenantId: args.tenantId,
          accountCode: LEDGER_BANK,
          accountName: LEDGER_BANK_NAME,
          entryType: "DEBIT",
          amount: refundRupees,
          description: `Razorpay refund ${args.providerRefundId}`,
          reference: gp.id,
          entryDate: paidDate,
          createdBy: SYSTEM_ACTOR,
        },
      });

      const refund = await tx.gatewayRefund.create({
        data: {
          tenantId: args.tenantId,
          gatewayPaymentId: gp.id,
          amountPaise: args.amountPaise,
          providerRefundId: args.providerRefundId,
          status: "PROCESSED",
          reason: args.reason,
          ledgerEntryId: ledger.id,
        },
      });

      const newStatus =
        netAfter >= BigInt(gp.amountPaise) ? "REFUNDED" : "PARTIALLY_REFUNDED";

      await tx.gatewayPayment.update({
        where: { id: gp.id },
        data: { status: newStatus },
      });

      const newPaid = Math.max(0, Number(gp.payment.paidAmount) - refundRupees);
      const totalDue = Number(gp.payment.amount);
      let installmentStatus: "PENDING" | "PARTIAL" | "PAID" = "PARTIAL";
      if (newPaid <= 0) installmentStatus = "PENDING";
      else if (newPaid >= totalDue) installmentStatus = "PAID";

      await tx.payment.update({
        where: { id: gp.paymentId },
        data: {
          paidAmount: newPaid,
          status: installmentStatus,
        },
      });

      return { refund, status: newStatus };
    });

    return { ...result, idempotent: false };
  }
}
