import { createHash, randomBytes } from "crypto";
import { Injectable } from "@nestjs/common";
import type {
  CancelIrnInput,
  CancelIrnResult,
  GenerateIrnInput,
  GenerateIrnResult,
  GstIrpProvider,
} from "./irp.interface";

/**
 * Sandbox / mock IRP adapter for local and CI.
 * Deterministic IRN from invoice number + supplier GSTIN (no network).
 * Replace with a licensed GSP client when GST_IRP_PROVIDER=cleartax (etc.).
 */
@Injectable()
export class MockIrpAdapter implements GstIrpProvider {
  readonly provider = "MOCK";

  async generateIrn(input: GenerateIrnInput): Promise<GenerateIrnResult> {
    const digest = createHash("sha256")
      .update(
        [
          input.supplierGstin,
          input.invoiceNumber,
          input.invoiceDate,
          input.totalPaise,
        ].join("|"),
      )
      .digest("hex")
      .toUpperCase();

    const irn = digest; // 64-char hex, IRN-shaped for sandbox
    const ackNo = `ACK${Date.now()}${randomBytes(2).toString("hex")}`.slice(
      0,
      20,
    );
    const ackDate = new Date();

    const signedQr = Buffer.from(
      JSON.stringify({
        irn,
        ackNo,
        supplierGstin: input.supplierGstin,
        invoiceNumber: input.invoiceNumber,
        totalPaise: input.totalPaise,
        mock: true,
      }),
      "utf8",
    ).toString("base64");

    return {
      irn,
      ackNo,
      ackDate,
      signedQr,
      provider: this.provider,
    };
  }

  async cancelIrn(input: CancelIrnInput): Promise<CancelIrnResult> {
    return {
      irn: input.irn,
      cancelled: true,
      provider: this.provider,
    };
  }
}
