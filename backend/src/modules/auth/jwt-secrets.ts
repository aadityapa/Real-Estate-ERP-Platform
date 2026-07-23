/**
 * @deprecated Prefer assertProductionSecretsConfigured from production-secrets.
 * Kept for existing imports; delegates to the expanded production secrets check.
 */
export {
  SECRET_PLACEHOLDERS,
  assertProductionSecretsConfigured as assertJwtSecretsConfigured,
} from "./production-secrets";

export const JWT_SECRET_PLACEHOLDERS = [
  "change-me-in-production-use-long-random-string",
  "change-me-refresh-secret-long-random-string",
] as const;
