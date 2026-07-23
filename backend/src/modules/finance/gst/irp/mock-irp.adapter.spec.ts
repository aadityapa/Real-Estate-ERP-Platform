import { MockIrpAdapter } from "./mock-irp.adapter";

describe("MockIrpAdapter", () => {
  const adapter = new MockIrpAdapter();

  it("returns deterministic IRN and base64 signed QR", async () => {
    const a = await adapter.generateIrn({
      invoiceId: "inv-1",
      invoiceNumber: "INV/2526/000001",
      invoiceDate: "2025-07-15",
      supplierGstin: "27AABCS1429B1Z5",
      buyerGstin: "29AABCT1332L1ZV",
      placeOfSupply: "29",
      taxablePaise: "10000",
      cgstPaise: "0",
      sgstPaise: "0",
      igstPaise: "1800",
      totalPaise: "11800",
      items: [],
    });
    const b = await adapter.generateIrn({
      invoiceId: "inv-1",
      invoiceNumber: "INV/2526/000001",
      invoiceDate: "2025-07-15",
      supplierGstin: "27AABCS1429B1Z5",
      placeOfSupply: "29",
      taxablePaise: "10000",
      cgstPaise: "0",
      sgstPaise: "0",
      igstPaise: "1800",
      totalPaise: "11800",
      items: [],
    });
    expect(a.irn).toBe(b.irn);
    expect(a.provider).toBe("MOCK");
    expect(a.signedQr.length).toBeGreaterThan(10);
    expect(JSON.parse(Buffer.from(a.signedQr, "base64").toString("utf8")).mock).toBe(
      true,
    );
  });

  it("cancels IRN in sandbox", async () => {
    const r = await adapter.cancelIrn({ irn: "ABC", reason: "test" });
    expect(r.cancelled).toBe(true);
  });
});
