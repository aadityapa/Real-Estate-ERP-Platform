import { isTracingEnabled, startTracing, shutdownTracing } from "./tracing";

describe("tracing", () => {
  const prev = {
    enabled: process.env["OTEL_ENABLED"],
    endpoint: process.env["OTEL_EXPORTER_OTLP_ENDPOINT"],
  };

  afterEach(async () => {
    await shutdownTracing();
    if (prev.enabled === undefined) delete process.env["OTEL_ENABLED"];
    else process.env["OTEL_ENABLED"] = prev.enabled;
    if (prev.endpoint === undefined) {
      delete process.env["OTEL_EXPORTER_OTLP_ENDPOINT"];
    } else {
      process.env["OTEL_EXPORTER_OTLP_ENDPOINT"] = prev.endpoint;
    }
  });

  it("is disabled by default (zero-config no-op)", () => {
    delete process.env["OTEL_ENABLED"];
    expect(isTracingEnabled()).toBe(false);
    startTracing();
  });

  it("starts when OTEL_ENABLED=true", async () => {
    process.env["OTEL_ENABLED"] = "true";
    process.env["OTEL_EXPORTER_OTLP_ENDPOINT"] =
      "http://127.0.0.1:9/v1/traces";
    expect(isTracingEnabled()).toBe(true);
    startTracing();
    await shutdownTracing();
  });
});
