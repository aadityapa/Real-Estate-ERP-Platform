import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { PrismaInstrumentation } from "@prisma/instrumentation";

function envFlag(name: string, defaultValue = false): boolean {
  const raw = process.env[name];
  if (raw == null || raw === "") return defaultValue;
  return /^(1|true|yes|on)$/i.test(raw);
}

let sdk: NodeSDK | undefined;

/**
 * Start OpenTelemetry when OTEL_ENABLED=true. No-op otherwise (dev zero-config).
 * Import this module first in main.ts so HTTP/ioredis patches apply before Nest boots.
 *
 * Point the collector via OTEL_EXPORTER_OTLP_ENDPOINT, e.g.:
 *   Jaeger:  http://localhost:4318/v1/traces
 *   Tempo:   http://tempo:4318/v1/traces
 *   Datadog: http://datadog-agent:4318/v1/traces  (OTLP intake)
 */
export function startTracing(): void {
  if (sdk) return;
  if (!envFlag("OTEL_ENABLED", false)) return;

  const serviceName = process.env["OTEL_SERVICE_NAME"] ?? "propos-api";
  const endpoint =
    process.env["OTEL_EXPORTER_OTLP_ENDPOINT"] ??
    "http://localhost:4318/v1/traces";

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
    }),
    traceExporter: new OTLPTraceExporter({ url: endpoint }),
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false },
        "@opentelemetry/instrumentation-dns": { enabled: false },
        "@opentelemetry/instrumentation-net": { enabled: false },
      }),
      new PrismaInstrumentation(),
    ],
  });

  sdk.start();
}

export async function shutdownTracing(): Promise<void> {
  if (!sdk) return;
  await sdk.shutdown().catch(() => undefined);
  sdk = undefined;
}

export function isTracingEnabled(): boolean {
  return envFlag("OTEL_ENABLED", false);
}
