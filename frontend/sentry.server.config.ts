import * as Sentry from "@sentry/nextjs";

const dsn =
  process.env["SENTRY_DSN"]?.trim() ||
  process.env["NEXT_PUBLIC_SENTRY_DSN"]?.trim();
const enabled =
  Boolean(dsn) &&
  !/^(0|false|no|off)$/i.test(process.env["SENTRY_ENABLED"] ?? "true");

if (enabled && dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env["SENTRY_ENVIRONMENT"] ??
      process.env["NODE_ENV"] ??
      "development",
    release:
      process.env["SENTRY_RELEASE"] ??
      process.env["NEXT_PUBLIC_SENTRY_RELEASE"],
    tracesSampleRate: Number.parseFloat(
      process.env["SENTRY_TRACES_SAMPLE_RATE"] ?? "0",
    ),
    sendDefaultPii: false,
  });
}
