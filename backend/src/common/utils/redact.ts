/** Keys whose values are always redacted in structured logs. */
const SECRET_KEY_RE =
  /^(authorization|cookie|set-cookie|password|passwd|secret|token|refreshToken|accessToken|api[-_]?key|jwt|private[-_]?key)$/i;

/** Field names that are PII when logged together with contact data. */
const PII_KEY_RE = /^(email|phone|mobile|aadhaar|pan|bankAccount|accountNumber|ifsc)$/i;

const REDACTED = "[REDACTED]";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/**
 * Deep-clone a value for logging, redacting secrets and PII field values.
 * Does not mutate the original. Depth-limited to avoid cycles / huge payloads.
 */
export function redactForLog(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[Truncated]";
  if (value == null) return value;
  if (typeof value === "string") {
    if (value.length > 500) return `${value.slice(0, 500)}…`;
    return value;
  }
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => redactForLog(item, depth + 1));
  }
  if (!isPlainObject(value)) return String(value);

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (SECRET_KEY_RE.test(key) || PII_KEY_RE.test(key)) {
      out[key] = REDACTED;
    } else if (key.toLowerCase() === "authorization" && typeof val === "string") {
      out[key] = REDACTED;
    } else {
      out[key] = redactForLog(val, depth + 1);
    }
  }
  return out;
}

/** Redact Authorization / Cookie header maps used in request logs. */
export function redactHeaders(
  headers: Record<string, unknown>,
): Record<string, unknown> {
  return redactForLog(headers) as Record<string, unknown>;
}
