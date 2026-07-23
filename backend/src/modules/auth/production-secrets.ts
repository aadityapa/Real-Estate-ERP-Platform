/**
 * Placeholders from backend/.env.example — forbidden in production when the
 * corresponding env var is set (or required).
 */
export const SECRET_PLACEHOLDERS = {
  JWT_SECRET: "change-me-in-production-use-long-random-string",
  JWT_REFRESH_SECRET: "change-me-refresh-secret-long-random-string",
  STORAGE_URL_SECRET: "change-me-storage-url-secret-long-random-string",
  PII_ENCRYPTION_KEY: "change-me-pii-encryption-key-32-byte-base64-or-hex",
} as const;

export type SecretEnv = {
  NODE_ENV?: string;
  JWT_SECRET?: string;
  JWT_REFRESH_SECRET?: string;
  STORAGE_URL_SECRET?: string;
  PII_ENCRYPTION_KEY?: string;
};

/**
 * Refuse to boot in production when required secrets are missing or equal to
 * .env.example placeholders.
 */
export function assertProductionSecretsConfigured(env: SecretEnv): void {
  const secret = env.JWT_SECRET?.trim();
  const refresh = env.JWT_REFRESH_SECRET?.trim();

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  if (!refresh) {
    throw new Error("JWT_REFRESH_SECRET is not configured");
  }

  if (env.NODE_ENV !== "production") {
    return;
  }

  const checks: Array<[keyof typeof SECRET_PLACEHOLDERS, string | undefined]> = [
    ["JWT_SECRET", secret],
    ["JWT_REFRESH_SECRET", refresh],
    ["STORAGE_URL_SECRET", env.STORAGE_URL_SECRET?.trim() || secret],
    ["PII_ENCRYPTION_KEY", env.PII_ENCRYPTION_KEY?.trim()],
  ];

  for (const [name, value] of checks) {
    if (!value) {
      throw new Error(`${name} is not configured`);
    }
    if (value === SECRET_PLACEHOLDERS[name]) {
      throw new Error(
        `${name} must not equal its .env.example placeholder in production`,
      );
    }
  }
}
