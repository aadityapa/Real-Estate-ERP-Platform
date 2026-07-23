import {
  aadhaarLast4,
  decryptJsonPii,
  decryptPii,
  encryptAadhaarLast4,
  encryptJsonPii,
  encryptPii,
  isPiiCiphertext,
  PII_ENC_PREFIX,
  resolvePiiKey,
} from "./pii-crypto";

describe("pii-crypto", () => {
  const key = resolvePiiKey({
    PII_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  } as NodeJS.ProcessEnv);

  it("resolves a 32-byte key from base64", () => {
    expect(key).not.toBeNull();
    expect(key!.length).toBe(32);
  });

  it("round-trips AES-256-GCM and marks ciphertext", () => {
    const plain = "ABCDE1234F";
    const ct = encryptPii(plain, key);
    expect(isPiiCiphertext(ct)).toBe(true);
    expect(ct.startsWith(PII_ENC_PREFIX)).toBe(true);
    expect(ct).not.toContain(plain);
    expect(decryptPii(ct, key)).toBe(plain);
  });

  it("stores only Aadhaar last-4 before encrypt", () => {
    const ct = encryptAadhaarLast4("1234-5678-9012", key);
    expect(decryptPii(ct, key)).toBe("9012");
    expect(aadhaarLast4("999988887777")).toBe("7777");
  });

  it("encrypts bank details JSON opaquely", () => {
    const details = { accountNumber: "1234567890", ifsc: "HDFC0001" };
    const ct = encryptJsonPii(details, key);
    expect(typeof ct).toBe("string");
    expect(isPiiCiphertext(ct as string)).toBe(true);
    expect(decryptJsonPii(ct, key)).toEqual(details);
  });

  it("leaves plaintext unchanged when no key is configured", () => {
    expect(encryptPii("PLAIN", null)).toBe("PLAIN");
    expect(decryptPii("PLAIN", null)).toBe("PLAIN");
  });

  it("is idempotent on already-encrypted values", () => {
    const ct = encryptPii("X", key);
    expect(encryptPii(ct, key)).toBe(ct);
  });
});
