const DEFAULT_API_ORIGIN = "http://localhost:3001";

function normalizeApiUrl(value: string | undefined): string {
  const raw = value?.trim() || `${DEFAULT_API_ORIGIN}/api/v1`;
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

/** REST base URL, e.g. http://localhost:3001/api/v1 */
export const API_URL = normalizeApiUrl(process.env["NEXT_PUBLIC_API_URL"]);

/** API origin without /api/v1 — used for static files (/storage) and PDF links */
export const API_ORIGIN =
  process.env["NEXT_PUBLIC_API_ORIGIN"]?.replace(/\/$/, "") ??
  (API_URL.replace(/\/api\/v1$/, "") || DEFAULT_API_ORIGIN);

/** Socket.IO server origin, e.g. http://localhost:3001 */
export const WS_URL =
  process.env["NEXT_PUBLIC_WS_URL"]?.replace(/\/$/, "") ?? API_ORIGIN;
