import * as Sentry from "@sentry/node";
import { redactForLog } from "../utils/redact";

function envFlag(name: string, defaultValue = false): boolean {
  const raw = process.env[name];
  if (raw == null || raw === "") return defaultValue;
  return /^(1|true|yes|on)$/i.test(raw);
}

let initialized = false;

/**
 * Sentry / GlitchTip — no-op when SENTRY_DSN is unset (dev zero-config).
 * Scrubs PII/secrets via beforeSend; set SENTRY_RELEASE for release tagging.
 */
export function initSentry(): void {
  if (initialized) return;
  const dsn = process.env["SENTRY_DSN"]?.trim();
  if (!dsn) return;
  if (!envFlag("SENTRY_ENABLED", true)) return;

  Sentry.init({
    dsn,
    environment: process.env["SENTRY_ENVIRONMENT"] ?? process.env["NODE_ENV"] ?? "development",
    release: process.env["SENTRY_RELEASE"],
    tracesSampleRate: Number.parseFloat(process.env["SENTRY_TRACES_SAMPLE_RATE"] ?? "0"),
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request?.headers) {
        event.request.headers = redactForLog(
          event.request.headers,
        ) as Record<string, string>;
      }
      if (event.request?.data) {
        event.request.data = redactForLog(event.request.data);
      }
      if (event.extra) {
        event.extra = redactForLog(event.extra) as Record<string, unknown>;
      }
      if (event.user) {
        // Keep id only — never email/username/ip together with contact PII.
        event.user = { id: event.user.id };
      }
      return event;
    },
  });
  initialized = true;
}

export function setSentryTenantTag(tenantId: string | undefined): void {
  if (!initialized || !tenantId) return;
  Sentry.setTag("tenantId", tenantId);
}

export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!initialized) return;
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(
        redactForLog(context) as Record<string, unknown>,
      );
    }
    Sentry.captureException(error);
  });
}

export function isSentryEnabled(): boolean {
  return initialized;
}
