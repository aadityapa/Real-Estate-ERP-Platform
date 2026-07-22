import { signStorageUrls } from "./transform.interceptor";

describe("signStorageUrls", () => {
  beforeAll(() => {
    process.env["STORAGE_URL_SECRET"] = "test-secret";
  });

  it("signs bare /storage paths with exp + sig query params", () => {
    const out = signStorageUrls({
      pdfUrl: "/storage/receipts/receipt-RCP-1.pdf",
    }) as { pdfUrl: string };
    expect(out.pdfUrl).toMatch(
      /^\/storage\/receipts\/receipt-RCP-1\.pdf\?exp=\d+&sig=[a-f0-9]{64}$/,
    );
  });

  it("walks nested objects and arrays", () => {
    const out = signStorageUrls({
      items: [{ agreement: { documentUrl: "/storage/agreements/a.pdf" } }],
    }) as { items: Array<{ agreement: { documentUrl: string } }> };
    expect(out.items[0]!.agreement.documentUrl).toContain("sig=");
  });

  it("leaves non-storage strings, dates and null untouched", () => {
    const date = new Date();
    const out = signStorageUrls({
      name: "Booking",
      createdAt: date,
      note: null,
      external: "https://example.com/file.pdf",
    }) as Record<string, unknown>;
    expect(out["name"]).toBe("Booking");
    expect(out["createdAt"]).toBe(date);
    expect(out["note"]).toBeNull();
    expect(out["external"]).toBe("https://example.com/file.pdf");
  });

  it("does not double-sign already signed URLs", () => {
    const once = signStorageUrls("/storage/receipts/r.pdf") as string;
    expect(signStorageUrls(once)).toBe(once);
  });
});
