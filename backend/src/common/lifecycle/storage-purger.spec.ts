import { mkdtempSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { StoragePurger } from "./storage-purger";

describe("StoragePurger", () => {
  it("deletes local files under storage root", async () => {
    const root = mkdtempSync(join(tmpdir(), "propos-storage-"));
    mkdirSync(join(root, "receipts"));
    const file = join(root, "receipts", "r1.pdf");
    writeFileSync(file, "pdf");

    const purger = new StoragePurger(root, async () => ({
      ok: true,
      stderr: "",
    }));
    const result = await purger.purge([
      { kind: "local", key: "receipts/r1.pdf" },
    ]);
    expect(existsSync(file)).toBe(false);
    expect(result.deleted).toContain("local:receipts/r1.pdf");
  });

  it("defers S3 when credentials missing", async () => {
    const prevBucket = process.env["AWS_S3_BUCKET"];
    const prevKey = process.env["AWS_ACCESS_KEY_ID"];
    delete process.env["AWS_S3_BUCKET"];
    delete process.env["AWS_ACCESS_KEY_ID"];

    const purger = new StoragePurger(tmpdir(), async () => ({
      ok: true,
      stderr: "",
    }));
    const result = await purger.purge([{ kind: "s3", key: "t/a.pdf" }]);
    expect(result.deferredS3Keys).toEqual(["t/a.pdf"]);

    if (prevBucket !== undefined) process.env["AWS_S3_BUCKET"] = prevBucket;
    if (prevKey !== undefined) process.env["AWS_ACCESS_KEY_ID"] = prevKey;
  });

  it("rejects path escape", async () => {
    const root = mkdtempSync(join(tmpdir(), "propos-storage-"));
    const purger = new StoragePurger(root, async () => ({
      ok: true,
      stderr: "",
    }));
    const result = await purger.purge([
      { kind: "local", key: "../outside.txt" },
    ]);
    expect(result.failed[0]?.reason).toBe("path-escape");
  });
});
