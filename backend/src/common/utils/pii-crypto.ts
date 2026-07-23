import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/** Wire format: enc:v1:<iv_b64>:<tag_b64>:<ciphertext_b64> */
export const PII_ENC_PREFIX = "enc:v1:";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

export function isPiiCiphertext(value: string): boolean {
  return value.startsWith(PII_ENC_PREFIX);
}

/**
 * Resolve AES-256 key from PII_ENCRYPTION_KEY (base64 or 64-char hex).
 * Returns null when unset (non-production may store plaintext until configured).
 */
export function resolvePiiKey(
  env: NodeJS.ProcessEnv = process.env,
): Buffer | null {
  const raw = env["PII_ENCRYPTION_KEY"]?.trim();
  if (!raw) return null;

  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }

  try {
    const buf = Buffer.from(raw, "base64");
    if (buf.length === KEY_LENGTH) return buf;
  } catch {
    // fall through
  }

  // Derive a stable 32-byte key from an arbitrary secret string (dev convenience).
  return createHash("sha256").update(raw).digest();
}

export function encryptPii(
  plaintext: string,
  key: Buffer | null = resolvePiiKey(),
): string {
  if (!key) return plaintext;
  if (isPiiCiphertext(plaintext)) return plaintext;

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return (
    PII_ENC_PREFIX +
    [
      iv.toString("base64url"),
      tag.toString("base64url"),
      encrypted.toString("base64url"),
    ].join(":")
  );
}

export function decryptPii(
  value: string | null | undefined,
  key: Buffer | null = resolvePiiKey(),
): string | null | undefined {
  if (value == null) return value;
  if (!isPiiCiphertext(value)) return value;
  if (!key) {
    throw new Error(
      "PII_ENCRYPTION_KEY is required to decrypt enc:v1 ciphertext",
    );
  }

  const body = value.slice(PII_ENC_PREFIX.length);
  const [ivB64, tagB64, dataB64] = body.split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed PII ciphertext");
  }

  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const data = Buffer.from(dataB64, "base64url");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
}

/** Store only Aadhaar last-4 digits (never the full number). */
export function aadhaarLast4(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) {
    throw new Error("Aadhaar must contain at least 4 digits");
  }
  return digits.slice(-4);
}

export function encryptAadhaarLast4(
  value: string,
  key: Buffer | null = resolvePiiKey(),
): string {
  return encryptPii(aadhaarLast4(value), key);
}

export function encryptJsonPii(
  value: unknown,
  key: Buffer | null = resolvePiiKey(),
): unknown {
  if (value == null) return value;
  if (typeof value === "string" && isPiiCiphertext(value)) return value;
  return encryptPii(JSON.stringify(value), key);
}

export function decryptJsonPii(
  value: unknown,
  key: Buffer | null = resolvePiiKey(),
): unknown {
  if (value == null) return value;
  if (typeof value === "string" && isPiiCiphertext(value)) {
    const plain = decryptPii(value, key);
    if (plain == null) return value;
    try {
      return JSON.parse(plain) as unknown;
    } catch {
      return plain;
    }
  }
  return value;
}

type CustomerLike = {
  pan?: string | null;
  aadhaar?: string | null;
  [key: string]: unknown;
};

export function encryptCustomerFields<T extends CustomerLike>(
  data: T,
  key: Buffer | null = resolvePiiKey(),
): T {
  const out = { ...data };
  if (typeof out.pan === "string" && out.pan.length > 0) {
    out.pan = encryptPii(out.pan.toUpperCase().replace(/\s+/g, ""), key);
  }
  if (typeof out.aadhaar === "string" && out.aadhaar.length > 0) {
    out.aadhaar = encryptAadhaarLast4(out.aadhaar, key);
  }
  return out;
}

export function decryptCustomerFields<T extends CustomerLike>(
  row: T,
  key: Buffer | null = resolvePiiKey(),
): T {
  const out = { ...row };
  if (typeof out.pan === "string") {
    out.pan = decryptPii(out.pan, key) ?? out.pan;
  }
  if (typeof out.aadhaar === "string") {
    out.aadhaar = decryptPii(out.aadhaar, key) ?? out.aadhaar;
  }
  return out;
}

type BankDetailsLike = {
  bankDetails?: unknown;
  [key: string]: unknown;
};

export function encryptBankDetailsFields<T extends BankDetailsLike>(
  data: T,
  key: Buffer | null = resolvePiiKey(),
): T {
  if (data.bankDetails === undefined) return data;
  return { ...data, bankDetails: encryptJsonPii(data.bankDetails, key) };
}

export function decryptBankDetailsFields<T extends BankDetailsLike>(
  row: T,
  key: Buffer | null = resolvePiiKey(),
): T {
  if (row.bankDetails === undefined) return row;
  return { ...row, bankDetails: decryptJsonPii(row.bankDetails, key) };
}
