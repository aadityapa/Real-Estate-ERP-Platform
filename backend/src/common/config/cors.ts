/**
 * Allowed browser origins for REST and WebSocket.
 * Set CORS_ORIGINS (comma-separated) or FRONTEND_URL for a single origin.
 */
export function getCorsOrigins(): string | string[] {
  const origins = process.env["CORS_ORIGINS"]?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins?.length) {
    return origins.length === 1 ? origins[0]! : origins;
  }

  return process.env["FRONTEND_URL"] ?? "http://localhost:3000";
}
