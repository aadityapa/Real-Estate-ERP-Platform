import { collectStorageRefs, parseStorageRef, stripUrlQuery } from "./storage-keys";

describe("storage-keys", () => {
  it("strips signed URL query params", () => {
    expect(stripUrlQuery("/storage/a.pdf?exp=1&sig=abc")).toBe("/storage/a.pdf");
  });

  it("parses local storage paths", () => {
    expect(parseStorageRef("/storage/receipts/r1.pdf")).toEqual({
      kind: "local",
      key: "receipts/r1.pdf",
    });
  });

  it("parses s3:// URIs", () => {
    expect(parseStorageRef("s3://propos-documents/tenants/t1/doc.pdf")).toEqual({
      kind: "s3",
      bucket: "propos-documents",
      key: "tenants/t1/doc.pdf",
    });
  });

  it("parses virtual-hosted S3 URLs", () => {
    const ref = parseStorageRef(
      "https://propos-documents.s3.ap-south-1.amazonaws.com/path/x.pdf",
    );
    expect(ref.kind).toBe("s3");
    expect(ref.bucket).toBe("propos-documents");
    expect(ref.key).toBe("path/x.pdf");
  });

  it("dedupes collected refs", () => {
    const refs = collectStorageRefs([
      "/storage/a.pdf",
      "/storage/a.pdf?exp=1&sig=x",
      "s3://b/k",
      "",
    ]);
    expect(refs).toHaveLength(2);
  });
});
