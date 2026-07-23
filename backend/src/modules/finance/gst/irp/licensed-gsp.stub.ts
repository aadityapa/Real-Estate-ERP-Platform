import { Injectable, Logger } from "@nestjs/common";
import type {
  CancelIrnInput,
  CancelIrnResult,
  GenerateIrnInput,
  GenerateIrnResult,
  GstIrpProvider,
} from "./irp.interface";

/**
 * Stub for a licensed GSP (e.g. ClearTax). Requires GST_GSP_API_KEY +
 * GST_GSP_BASE_URL. Throws until wired to a real vendor SDK.
 * Documented in docs/GST_EINVOICING.md.
 */
@Injectable()
export class LicensedGspStubAdapter implements GstIrpProvider {
  readonly provider = "GSP_STUB";
  private readonly logger = new Logger(LicensedGspStubAdapter.name);

  async generateIrn(_input: GenerateIrnInput): Promise<GenerateIrnResult> {
    this.logger.warn(
      "Licensed GSP adapter selected but not configured — set GST_IRP_PROVIDER=mock or implement GSP client",
    );
    throw new Error(
      "Licensed GSP not configured. Use GST_IRP_PROVIDER=mock for sandbox, or implement a GSP client with GST_GSP_API_KEY.",
    );
  }

  async cancelIrn(_input: CancelIrnInput): Promise<CancelIrnResult> {
    throw new Error(
      "Licensed GSP not configured. Use GST_IRP_PROVIDER=mock for sandbox.",
    );
  }
}
