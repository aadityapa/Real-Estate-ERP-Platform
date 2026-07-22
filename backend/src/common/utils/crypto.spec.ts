import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  sha256Hex,
  sha256File,
  hmacSha256Hex,
  safeEqual,
  signStoragePath,
  verifyStoragePath,
} from "./crypto";

describe("crypto utils (SHA-256)", () => {
  beforeAll(() => {
    process.env["STORAGE_URL_SECRET"] = "test-secret";
  });

  it("sha256Hex matches the known test vector for 'abc'", () => {
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("sha256Hex produces 64 hex chars and is deterministic", () => {
    const a = sha256Hex("propos");
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(sha256Hex("propos")).toBe(a);
    expect(sha256Hex("propos!")).not.toBe(a);
  });

  it("sha256File streams a file and matches sha256Hex of its contents", async () => {
    const dir = mkdtempSync(join(tmpdir(), "crypto-spec-"));
    const file = join(dir, "sample.pdf");
    writeFileSync(file, "fake-pdf-content");
    try {
      expect(await sha256File(file)).toBe(sha256Hex("fake-pdf-content"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("hmacSha256Hex differs per secret", () => {
    expect(hmacSha256Hex("s1", "payload")).not.toBe(
      hmacSha256Hex("s2", "payload"),
    );
  });

  it("safeEqual compares in constant time semantics", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });

  describe("signed storage URLs", () => {
    it("signs and verifies a valid unexpired link", () => {
      const signed = signStoragePath("/storage/receipts/r1.pdf", 60);
      const url = new URL(`http://x${signed}`);
      expect(
        verifyStoragePath(
          "/storage/receipts/r1.pdf",
          url.searchParams.get("exp") ?? undefined,
          url.searchParams.get("sig") ?? undefined,
        ),
      ).toBe(true);
    });

    it("rejects an expired link", () => {
      const signed = signStoragePath("/storage/receipts/r1.pdf", -10);
      const url = new URL(`http://x${signed}`);
      expect(
        verifyStoragePath(
          "/storage/receipts/r1.pdf",
          url.searchParams.get("exp") ?? undefined,
          url.searchParams.get("sig") ?? undefined,
        ),
      ).toBe(false);
    });

    it("rejects a tampered path or signature", () => {
      const signed = signStoragePath("/storage/receipts/r1.pdf", 60);
      const url = new URL(`http://x${signed}`);
      const exp = url.searchParams.get("exp") ?? undefined;
      const sig = url.searchParams.get("sig") ?? undefined;
      expect(verifyStoragePath("/storage/receipts/OTHER.pdf", exp, sig)).toBe(false);
      expect(verifyStoragePath("/storage/receipts/r1.pdf", exp, "0".repeat(64))).toBe(false);
      expect(verifyStoragePath("/storage/receipts/r1.pdf", undefined, sig)).toBe(false);
    });
  });
});
