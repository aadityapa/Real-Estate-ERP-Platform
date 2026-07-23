import { createHmac } from "crypto";
import { MockESignAdapter } from "./mock-esign.adapter";

describe("MockESignAdapter", () => {
  const adapter = new MockESignAdapter();

  it("creates a signing request with mock provider id and sign URL", async () => {
    const result = await adapter.createSigningRequest({
      correlationId: "doc-abc123456789",
      documentName: "Agreement.pdf",
      fileUrl: "/storage/agreements/x.pdf",
      signerName: "Buyer",
      webhookUrl: "http://localhost/webhook",
    });
    expect(result.provider).toBe("mock");
    expect(result.providerRequestId).toContain("mock-esign-");
    expect(result.signUrl).toContain(result.providerRequestId);
    expect(result.status).toBe("SENT");
  });

  it("verifies webhook HMAC and parses status", () => {
    process.env["ESIGN_WEBHOOK_SECRET"] = "test-secret";
    const body = JSON.stringify({
      providerRequestId: "mock-1",
      status: "SIGNED",
      signedFileUrl: "/storage/signed.pdf",
    });
    const sig = createHmac("sha256", "test-secret").update(body).digest("hex");
    expect(adapter.verifyWebhook(Buffer.from(body), sig)).toBe(true);
    expect(adapter.verifyWebhook(Buffer.from(body), "bad")).toBe(false);

    const parsed = adapter.parseWebhook(JSON.parse(body));
    expect(parsed.status).toBe("SIGNED");
    expect(parsed.providerRequestId).toBe("mock-1");
  });
});
