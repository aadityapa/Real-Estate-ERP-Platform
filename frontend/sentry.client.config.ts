import * as Sentry from "@sentry/nextjs";

const dsn = process.env["NEXT_PUBLIC_SENTRY_DSN"]?.trim();
const enabled =
  Boolean(dsn) &&
  !/^(0|false|no|off)$/i.test(process.env["NEXT_PUBLIC_SENTRY_ENABLED"] ?? "true");

if (enabled && dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env["NEXT_PUBLIC_SENTRY_ENVIRONMENT"] ??
      process.env["NODE_ENV"] ??
      "development",
    release: process.env["NEXT_PUBLIC_SENTRY_RELEASE"],
    tracesSampleRate: Number.parseFloat(
      process.env["NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE"] ?? "0",
    ),
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.user) {
        event.user = { id: event.user.id };
      }
      if (event.request?.headers) {
        const headers = { ...event.request.headers };
        for (const key of Object.keys(headers)) {
          if (/authorization|cookie|token|password/i.test(key)) {
            headers[key] = "[REDACTED]";
          }
        }
        event.request.headers = headers;
      }
      return event;
    },
  });
}
