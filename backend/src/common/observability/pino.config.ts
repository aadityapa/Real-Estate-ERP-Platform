import type { Params } from "nestjs-pino";
import { getTenantStore } from "../tenant/tenant-context";
import { getRequestLogStore } from "./request-log-context";

/** Pino field paths that must never appear in logs (secrets / PII). */
export const PINO_REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
  "req.headers['set-cookie']",
  "password",
  "passwd",
  "secret",
  "token",
  "refreshToken",
  "accessToken",
  "apiKey",
  "api_key",
  "jwt",
  "email",
  "phone",
  "mobile",
  "aadhaar",
  "pan",
  "bankAccount",
  "accountNumber",
  "ifsc",
  "*.password",
  "*.token",
  "*.refreshToken",
  "*.accessToken",
  "*.email",
  "*.phone",
  "*.pan",
  "*.aadhaar",
];

/**
 * nestjs-pino / pino-http options. Auto access logs stay off — we use
 * request-logging middleware so health/metrics stay quiet and tenantId is set.
 * Always emits JSON (playbook); set LOG_LEVEL (default info).
 */
export function buildPinoParams(): Params {
  const level = process.env["LOG_LEVEL"] ?? "info";

  return {
    pinoHttp: {
      level,
      redact: {
        paths: PINO_REDACT_PATHS,
        censor: "[REDACTED]",
      },
      mixin() {
        const reqStore = getRequestLogStore();
        const tenant = getTenantStore();
        return {
          requestId: reqStore?.requestId,
          tenantId: tenant?.tenantId,
        };
      },
      autoLogging: false,
      quietReqLogger: true,
    },
  };
}
