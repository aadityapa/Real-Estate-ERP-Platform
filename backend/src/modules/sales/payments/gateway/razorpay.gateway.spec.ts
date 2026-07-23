import { createHmac } from "crypto";
import { RazorpayGateway } from "./razorpay.gateway";

describe("RazorpayGateway", () => {
  const prev = { ...process.env };

  beforeEach(() => {
    process.env["RAZORPAY_KEY_ID"] = "rzp_test_key";
    process.env["RAZORPAY_KEY_SECRET"] = "test_secret";
    process.env["RAZORPAY_WEBHOOK_SECRET"] = "whsec";
  });

  afterEach(() => {
    process.env = { ...prev };
  });

  it("verifies checkout signature with HMAC-SHA256", () => {
    const gateway = new RazorpayGateway();
    const orderId = "order_abc";
    const paymentId = "pay_xyz";
    const signature = createHmac("sha256", "test_secret")
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    expect(
      gateway.verifyCheckoutSignature({ orderId, paymentId, signature }),
    ).toBe(true);
    expect(
      gateway.verifyCheckoutSignature({
        orderId,
        paymentId,
        signature: "deadbeef",
      }),
    ).toBe(false);
  });

  it("verifies webhook signature over raw body", () => {
    const gateway = new RazorpayGateway();
    const raw = JSON.stringify({ id: "evt_1", event: "payment.captured" });
    const signature = createHmac("sha256", "whsec").update(raw).digest("hex");
    expect(gateway.verifyWebhookSignature(raw, signature)).toBe(true);
    expect(gateway.verifyWebhookSignature(raw, "nope")).toBe(false);
  });
});
