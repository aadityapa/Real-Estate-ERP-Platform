import { createHash, createHmac, timingSafeEqual } from "crypto";
import { createReadStream } from "fs";

/**
 * SHA-256 hex digest of a string or buffer.
 * Used for token hashing (never store raw tokens) and file integrity checksums.
 */
export function sha256Hex(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Compute the SHA-256 checksum of a file on disk (streamed — safe for large files).
 */
export function sha256File(filepath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filepath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

/** HMAC-SHA256 hex digest — used for signed storage URLs. */
export function hmacSha256Hex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/** Constant-time string comparison to prevent timing attacks. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function storageSecret(): string {
  const secret =
    process.env["STORAGE_URL_SECRET"] ?? process.env["JWT_SECRET"];
  if (!secret) {
    throw new Error("STORAGE_URL_SECRET or JWT_SECRET must be configured");
  }
  return secret;
}

/**
 * Sign a /storage/... path with an expiring HMAC-SHA256 signature.
 * Returns e.g. /storage/receipts/x.pdf?exp=1700000000&sig=<hex>
 */
export function signStoragePath(path: string, ttlSeconds = 900): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = hmacSha256Hex(storageSecret(), `${path}:${exp}`);
  return `${path}?exp=${exp}&sig=${sig}`;
}

/**
 * Verify an expiring HMAC-SHA256 signature for a /storage/... path.
 */
export function verifyStoragePath(
  path: string,
  exp: string | undefined,
  sig: string | undefined,
): boolean {
  if (!exp || !sig) return false;
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || expNum < Math.floor(Date.now() / 1000)) {
    return false;
  }
  const expected = hmacSha256Hex(storageSecret(), `${path}:${exp}`);
  return safeEqual(expected, sig);
}
