export const GST_IRP_PROVIDER = Symbol("GST_IRP_PROVIDER");

export type IrpInvoiceLine = {
  description: string;
  hsnSac: string;
  quantity: number;
  unitPricePaise: string;
  taxablePaise: string;
  gstRateBps: number;
  cgstPaise: string;
  sgstPaise: string;
  igstPaise: string;
};

export type GenerateIrnInput = {
  /** Internal invoice id (for correlation; not logged with PII). */
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string; // ISO date
  supplierGstin: string;
  buyerGstin?: string | null;
  buyerName?: string | null;
  placeOfSupply: string;
  taxablePaise: string;
  cgstPaise: string;
  sgstPaise: string;
  igstPaise: string;
  totalPaise: string;
  items: IrpInvoiceLine[];
};

export type GenerateIrnResult = {
  irn: string;
  ackNo: string;
  ackDate: Date;
  /** Signed QR payload (base64 or JSON string from GSP). */
  signedQr: string;
  provider: string;
  raw?: unknown;
};

export type CancelIrnInput = {
  irn: string;
  reason: string;
};

export type CancelIrnResult = {
  irn: string;
  cancelled: boolean;
  provider: string;
};

/**
 * Pluggable GST Invoice Registration Portal (IRP) / GSP adapter.
 * Production needs a licensed GSP (ClearTax, IRIS, etc.) behind env keys.
 * Never log full buyer PII with GSTIN in structured logs.
 */
export interface GstIrpProvider {
  readonly provider: string;

  generateIrn(input: GenerateIrnInput): Promise<GenerateIrnResult>;

  cancelIrn(input: CancelIrnInput): Promise<CancelIrnResult>;
}
