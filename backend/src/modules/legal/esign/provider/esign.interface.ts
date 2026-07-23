export const ESIGN_PROVIDER = Symbol("ESIGN_PROVIDER");

export type CreateESignInput = {
  /** Internal correlation id (document / request) — no PII in logs. */
  correlationId: string;
  documentName: string;
  /** Public or storage path the provider can fetch (mock ignores). */
  fileUrl: string;
  signerName: string;
  signerEmail?: string;
  /** Absolute webhook callback URL. */
  webhookUrl: string;
};

export type CreateESignResult = {
  providerRequestId: string;
  signUrl: string;
  provider: string;
  status: "PENDING" | "SENT";
};

export type ESignWebhookParseResult = {
  providerRequestId: string;
  status: "SENT" | "VIEWED" | "SIGNED" | "DECLINED" | "EXPIRED" | "FAILED";
  signedFileUrl?: string;
};

/**
 * Pluggable e-sign provider (Digio / Leegality / DocuSign).
 * Default: MockESignAdapter when live credentials are not configured.
 */
export interface ESignProvider {
  readonly provider: string;

  createSigningRequest(input: CreateESignInput): Promise<CreateESignResult>;

  verifyWebhook(rawBody: Buffer, signature: string | undefined): boolean;

  parseWebhook(payload: unknown): ESignWebhookParseResult;
}
