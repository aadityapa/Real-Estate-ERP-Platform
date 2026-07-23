/**
 * Allowed browser origins for REST and WebSocket.
 * Set CORS_ORIGINS (comma-separated) or FRONTEND_URL for a single origin.
 * Never returns `*` — credentials require an explicit allowlist.
 */
export function getCorsOrigins(): string | string[] {
  const origins = process.env["CORS_ORIGINS"]?.split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin && origin !== "*");

  if (origins?.length) {
    return origins.length === 1 ? origins[0]! : origins;
  }

  const frontend = process.env["FRONTEND_URL"]?.trim();
  if (frontend && frontend !== "*") {
    return frontend;
  }

  return "http://localhost:3000";
}
