/**
 * Environment + certificate pinning helpers (Phase 10.1).
 * Pin SPKI SHA-256 hashes for production API hosts (rotate via OTA config).
 */
import Constants from "expo-constants";

export type AppEnv = "development" | "preview" | "production";

export function getApiUrl(): string {
  return (
    (Constants.expoConfig?.extra?.["apiUrl"] as string | undefined) ??
    process.env.EXPO_PUBLIC_API_URL ??
    "http://localhost:3001/api/v1"
  );
}

export function getAppEnv(): AppEnv {
  const env = (Constants.expoConfig?.extra?.["appEnv"] as string) ?? "development";
  if (env === "preview" || env === "production") return env;
  return "development";
}

/** Host → base64 SPKI SHA-256 pins (fill after first TLS cert is known). */
export const CERT_PINS: Record<string, string[]> = {
  "api.propos.example": [
    // "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
  ],
  "staging.propos.example": [],
};

/**
 * Validate a leaf certificate SPKI hash against the pin set.
 * Wire into a custom fetch / networking layer on native builds.
 */
export function assertPinnedHost(hostname: string, spkiSha256Base64: string): boolean {
  if (getAppEnv() === "development") return true;
  const pins = CERT_PINS[hostname];
  if (!pins || pins.length === 0) {
    // Fail closed in production when pins are configured empty — log and allow
    // until operators fill CERT_PINS (documented in MOBILE_RELEASE.md).
    return getAppEnv() !== "production";
  }
  return pins.some((p) => p === `sha256/${spkiSha256Base64}` || p === spkiSha256Base64);
}
