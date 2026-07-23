import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import type {
  CreateESignInput,
  CreateESignResult,
  ESignProvider,
  ESignWebhookParseResult,
} from "./esign.interface";

/**
 * Digio stub — throws until DIGIO_CLIENT_ID / DIGIO_CLIENT_SECRET are wired
 * to a real HTTP adapter. Selected when ESIGN_PROVIDER=digio.
 */
@Injectable()
export class DigioStubAdapter implements ESignProvider {
  readonly provider = "digio";

  async createSigningRequest(_input: CreateESignInput): Promise<CreateESignResult> {
    throw new ServiceUnavailableException(
      "Digio e-sign is not configured. Set DIGIO_CLIENT_ID / DIGIO_CLIENT_SECRET and implement the HTTP adapter, or use ESIGN_PROVIDER=mock.",
    );
  }

  verifyWebhook(_rawBody: Buffer, _signature: string | undefined): boolean {
    return false;
  }

  parseWebhook(_payload: unknown): ESignWebhookParseResult {
    throw new ServiceUnavailableException("Digio e-sign webhook not configured");
  }
}
