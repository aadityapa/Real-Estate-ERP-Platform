import { createHmac } from "crypto";
import { UnauthorizedException } from "@nestjs/common";
import { GatewayPaymentsService } from "./gateway-payments.service";
import type { PaymentGateway } from "./payment-gateway.interface";
import { rupeesToPaise } from "./money";

type MockFn = jest.Mock;

describe("GatewayPaymentsService", () => {
  let service: GatewayPaymentsService;
  let gateway: jest.Mocked<PaymentGateway>;
  let prisma: {
    payment: { findFirst: MockFn; update: MockFn };
    gatewayPayment: {
      create: MockFn;
      findFirst: MockFn;
      findUnique: MockFn;
      findMany: MockFn;
      update: MockFn;
    };
    gatewayRefund: { findUnique: MockFn };
    gatewayWebhookEvent: { findUnique: MockFn; create: MockFn };
    ledgerEntry: { findMany: MockFn };
    $transaction: MockFn;
  };
  let pdfService: { generateReceipt: MockFn };
  let eventsService: { emitPaymentReceived: MockFn };
  let tenantContext: { runAsSystem: MockFn };

  const tenantId = "tenant-a";
  const installment = {
    id: "pay-1",
    bookingId: "book-1",
    installmentName: "Booking Amount",
    amount: 10000,
    paidAmount: 0,
    status: "PENDING",
    booking: {
      bookingNumber: "BK-1",
      customer: { firstName: "Ada", lastName: "Lovelace" },
      lead: { tenantId },
    },
  };

  const gatewayPaymentRow = {
    id: "gp-1",
    tenantId,
    bookingId: "book-1",
    paymentId: "pay-1",
    amountPaise: 1_000_000n,
    status: "CREATED",
    providerOrderId: "order_1",
    providerPaymentId: null as string | null,
    receiptId: null as string | null,
    ledgerEntryId: null as string | null,
    refunds: [] as Array<{ amountPaise: bigint; status: string }>,
    payment: installment,
  };

  beforeEach(() => {
    gateway = {
      provider: "RAZORPAY",
      createOrder: jest.fn().mockResolvedValue({
        orderId: "order_1",
        amountPaise: 1_000_000n,
        currency: "INR",
        status: "created",
      }),
      verifyCheckoutSignature: jest.fn().mockReturnValue(true),
      verifyWebhookSignature: jest.fn().mockReturnValue(true),
      createRefund: jest.fn().mockResolvedValue({
        refundId: "rfnd_1",
        amountPaise: 1_000_000n,
        status: "processed",
      }),
    };

    const tx = {
      receipt: {
        create: jest.fn().mockResolvedValue({ id: "rcp-1", receiptNumber: "RCP-1" }),
        update: jest.fn().mockResolvedValue({}),
      },
      payment: {
        update: jest.fn().mockResolvedValue({}),
      },
      ledgerEntry: {
        create: jest.fn().mockResolvedValue({ id: "led-1" }),
      },
      gatewayPayment: {
        update: jest.fn().mockImplementation(({ data }: { data: object }) =>
          Promise.resolve({ ...gatewayPaymentRow, ...data, id: "gp-1" }),
        ),
      },
      gatewayRefund: {
        create: jest.fn().mockImplementation(({ data }: { data: object }) =>
          Promise.resolve({ id: "gr-1", ...data }),
        ),
      },
    };

    prisma = {
      payment: {
        findFirst: jest.fn().mockResolvedValue(installment),
        update: jest.fn(),
      },
      gatewayPayment: {
        create: jest.fn().mockResolvedValue({
          id: "gp-1",
          providerOrderId: "order_1",
        }),
        findFirst: jest.fn().mockResolvedValue({ ...gatewayPaymentRow }),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      gatewayRefund: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      gatewayWebhookEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      ledgerEntry: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
    };

    pdfService = {
      generateReceipt: jest.fn().mockResolvedValue({
        url: "/storage/rcp.pdf",
        checksum: "abc",
      }),
    };
    eventsService = { emitPaymentReceived: jest.fn() };
    tenantContext = {
      runAsSystem: jest.fn((fn: () => unknown) => fn()),
    };

    service = new GatewayPaymentsService(
      prisma as never,
      pdfService as never,
      eventsService as never,
      tenantContext as never,
      gateway,
    );
  });

  it("createOrder stores amount as integer paise and calls gateway", async () => {
    const result = await service.createOrder(tenantId, { paymentId: "pay-1" });
    expect(gateway.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        amountPaise: rupeesToPaise(10000),
        currency: "INR",
        notes: expect.objectContaining({ tenantId, paymentId: "pay-1" }),
      }),
    );
    expect(prisma.gatewayPayment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId,
          amountPaise: 1_000_000n,
          providerOrderId: "order_1",
        }),
      }),
    );
    expect(result.orderId).toBe("order_1");
    expect(result.amountPaise).toBe("1000000");
  });

  it("happy path: confirm captures payment, receipt, and ledger", async () => {
    const result = await service.confirmCheckout(tenantId, {
      razorpayOrderId: "order_1",
      razorpayPaymentId: "pay_rz_1",
      razorpaySignature: "sig",
    });

    expect(gateway.verifyCheckoutSignature).toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(eventsService.emitPaymentReceived).toHaveBeenCalledWith(
      tenantId,
      expect.objectContaining({ bookingNumber: "BK-1", amount: 10000 }),
    );
    expect(result.status).toBe("CAPTURED");
    expect(result.idempotent).toBe(false);
  });

  it("rejects confirm when checkout signature mismatches", async () => {
    gateway.verifyCheckoutSignature.mockReturnValue(false);
    await expect(
      service.confirmCheckout(tenantId, {
        razorpayOrderId: "order_1",
        razorpayPaymentId: "pay_rz_1",
        razorpaySignature: "bad",
      }),
    ).rejects.toThrow(UnauthorizedException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("webhook: signature mismatch is rejected", async () => {
    gateway.verifyWebhookSignature.mockReturnValue(false);
    await expect(service.handleWebhook("{}", "bad-sig")).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("webhook: replayed event is idempotent (DUPLICATE)", async () => {
    prisma.gatewayWebhookEvent.findUnique.mockResolvedValue({
      id: "evt-row",
      eventId: "evt_1",
    });

    const body = JSON.stringify({
      id: "evt_1",
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_rz_1",
            order_id: "order_1",
            amount: 1_000_000,
            notes: { tenantId },
          },
        },
      },
    });

    const result = await service.handleWebhook(body, "sig");
    expect(result.status).toBe("DUPLICATE");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("webhook: payment.captured confirms once; second confirm is idempotent", async () => {
    const body = JSON.stringify({
      id: "evt_2",
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_rz_1",
            order_id: "order_1",
            amount: 1_000_000,
            notes: { tenantId },
          },
        },
      },
    });

    const first = await service.handleWebhook(body, "sig");
    expect(first.status).toBe("PROCESSED");
    expect(prisma.gatewayWebhookEvent.create).toHaveBeenCalled();

    prisma.gatewayPayment.findFirst.mockResolvedValue({
      ...gatewayPaymentRow,
      status: "CAPTURED",
      providerPaymentId: "pay_rz_1",
      receiptId: "rcp-1",
      ledgerEntryId: "led-1",
    });

    const second = await service.confirmCheckout(tenantId, {
      razorpayOrderId: "order_1",
      razorpayPaymentId: "pay_rz_1",
      razorpaySignature: "sig",
    });
    expect(second.idempotent).toBe(true);
    expect(second.status).toBe("CAPTURED");
  });

  it("refund: creates refund, ledger debit, and updates status", async () => {
    prisma.gatewayPayment.findFirst.mockResolvedValue({
      ...gatewayPaymentRow,
      status: "CAPTURED",
      providerPaymentId: "pay_rz_1",
      refunds: [],
      payment: { ...installment, paidAmount: 10000, status: "PAID" },
    });

    const result = await service.refund(tenantId, "gp-1", {});
    expect(gateway.createRefund).toHaveBeenCalledWith(
      expect.objectContaining({
        providerPaymentId: "pay_rz_1",
        amountPaise: 1_000_000n,
      }),
    );
    expect(result.idempotent).toBe(false);
    expect("status" in result && result.status).toBe("REFUNDED");
  });

  it("money helper keeps integer paise", () => {
    expect(rupeesToPaise(10.55)).toBe(1055n);
    expect(createHmac("sha256", "sec").update("a|b").digest("hex")).toHaveLength(
      64,
    );
  });
});
