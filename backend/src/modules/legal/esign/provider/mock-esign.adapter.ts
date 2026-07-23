import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { Injectable } from "@nestjs/common";
import type {
  CreateESignInput,
  CreateESignResult,
  ESignProvider,
  ESignWebhookParseResult,
} from "./esign.interface";

/**
 * Sandbox e-sign adapter — no network. Deterministic request ids for tests.
 * Used when ESIGN_PROVIDER=mock (default) or Digio keys are missing.
 */
@Injectable()
export class MockESignAdapter implements ESignProvider {
  readonly provider = "mock";

  async createSigningRequest(
    input: CreateESignInput,
  ): Promise<CreateESignResult> {
    const providerRequestId = `mock-esign-${input.correlationId.slice(0, 12)}-${randomUUID().slice(0, 8)}`;
    return {
      providerRequestId,
      signUrl: `https://esign.local/mock/sign/${providerRequestId}`,
      provider: this.provider,
      status: "SENT",
    };
  }

  verifyWebhook(rawBody: Buffer, signature: string | undefined): boolean {
    const secret = process.env["ESIGN_WEBHOOK_SECRET"] ?? "mock-esign-secret";
    if (!signature) return false;
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    try {
      const a = Buffer.from(expected, "utf8");
      const b = Buffer.from(signature, "utf8");
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  parseWebhook(payload: unknown): ESignWebhookParseResult {
    const p = payload as {
      providerRequestId?: string;
      status?: string;
      signedFileUrl?: string;
    };
    if (!p?.providerRequestId || !p?.status) {
      throw new Error("invalid_mock_esign_webhook");
    }
    const status = p.status.toUpperCase() as ESignWebhookParseResult["status"];
    return {
      providerRequestId: p.providerRequestId,
      status,
      signedFileUrl: p.signedFileUrl,
    };
  }
}
