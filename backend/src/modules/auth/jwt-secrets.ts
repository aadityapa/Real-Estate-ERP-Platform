/**
 * Placeholders from backend/.env.example — forbidden in production.
 */
export const JWT_SECRET_PLACEHOLDERS = [
  "change-me-in-production-use-long-random-string",
  "change-me-refresh-secret-long-random-string",
] as const;

export function assertJwtSecretsConfigured(env: {
  NODE_ENV?: string;
  JWT_SECRET?: string;
  JWT_REFRESH_SECRET?: string;
}): void {
  const secret = env.JWT_SECRET?.trim();
  const refresh = env.JWT_REFRESH_SECRET?.trim();

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  if (!refresh) {
    throw new Error("JWT_REFRESH_SECRET is not configured");
  }

  if (env.NODE_ENV === "production") {
    const placeholders = new Set<string>(JWT_SECRET_PLACEHOLDERS);
    if (placeholders.has(secret) || placeholders.has(refresh)) {
      throw new Error(
        "JWT_SECRET / JWT_REFRESH_SECRET must not equal .env.example placeholders in production",
      );
    }
  }
}
