import { createHmac, timingSafeEqual } from "crypto";
import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import type {
  CreateGatewayOrderInput,
  CreateGatewayOrderResult,
  CreateGatewayRefundInput,
  CreateGatewayRefundResult,
  PaymentGateway,
  VerifyCheckoutSignatureInput,
} from "./payment-gateway.interface";

const RAZORPAY_API = "https://api.razorpay.com/v1";

@Injectable()
export class RazorpayGateway implements PaymentGateway {
  readonly provider = "RAZORPAY" as const;
  private readonly logger = new Logger(RazorpayGateway.name);

  private keyId(): string {
    return process.env["RAZORPAY_KEY_ID"]?.trim() ?? "";
  }

  private keySecret(): string {
    return process.env["RAZORPAY_KEY_SECRET"]?.trim() ?? "";
  }

  private webhookSecret(): string {
    return (
      process.env["RAZORPAY_WEBHOOK_SECRET"]?.trim() ||
      this.keySecret()
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

  async createOrder(
    input: CreateGatewayOrderInput,
  ): Promise<CreateGatewayOrderResult> {
    this.assertConfigured();
    const amount = Number(input.amountPaise);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new ServiceUnavailableException("Invalid order amount");
    }

    const res = await fetch(`${RAZORPAY_API}/orders`, {
      method: "POST",
      headers: {
        Authorization: this.authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency: input.currency || "INR",
        receipt: input.receipt.slice(0, 40),
        notes: input.notes ?? {},
      }),
    });

    if (!res.ok) {
      this.logger.warn({
        msg: "razorpay_order_create_failed",
        status: res.status,
      });
      throw new ServiceUnavailableException("Failed to create Razorpay order");
    }

    const body = (await res.json()) as {
      id: string;
      amount: number;
      currency: string;
      status: string;
    };

    return {
      orderId: body.id,
      amountPaise: BigInt(body.amount),
      currency: body.currency,
      status: body.status,
    };
  }

  verifyCheckoutSignature(input: VerifyCheckoutSignatureInput): boolean {
    this.assertConfigured();
    const expected = createHmac("sha256", this.keySecret())
      .update(`${input.orderId}|${input.paymentId}`)
      .digest("hex");
    return equalHex(expected, input.signature);
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const secret = this.webhookSecret();
    if (!secret) {
      return false;
    }
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    return equalHex(expected, signature);
  }

  async createRefund(
    input: CreateGatewayRefundInput,
  ): Promise<CreateGatewayRefundResult> {
    this.assertConfigured();
    const amount = Number(input.amountPaise);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new ServiceUnavailableException("Invalid refund amount");
    }

    const res = await fetch(
      `${RAZORPAY_API}/payments/${encodeURIComponent(input.providerPaymentId)}/refund`,
      {
        method: "POST",
        headers: {
          Authorization: this.authHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          notes: input.notes ?? {},
        }),
      },
    );

    if (!res.ok) {
      this.logger.warn({
        msg: "razorpay_refund_failed",
        status: res.status,
      });
      throw new ServiceUnavailableException("Failed to create Razorpay refund");
    }

    const body = (await res.json()) as {
      id: string;
      amount: number;
      status: string;
    };

    return {
      refundId: body.id,
      amountPaise: BigInt(body.amount),
      status: body.status,
    };
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
