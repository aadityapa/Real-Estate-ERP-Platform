import { buildPinoParams, PINO_REDACT_PATHS } from "./pino.config";
import { runWithRequestLogStore } from "./request-log-context";
import { runWithTenantStore } from "../tenant/tenant-context";

describe("pino observability config", () => {
  const prevLevel = process.env["LOG_LEVEL"];

  afterEach(() => {
    if (prevLevel === undefined) delete process.env["LOG_LEVEL"];
    else process.env["LOG_LEVEL"] = prevLevel;
  });

  it("includes secret and PII redact paths", () => {
    expect(PINO_REDACT_PATHS).toEqual(
      expect.arrayContaining([
        "req.headers.authorization",
        "password",
        "email",
        "pan",
        "*.refreshToken",
      ]),
    );
  });

  it("honors LOG_LEVEL and mixes requestId + tenantId", () => {
    process.env["LOG_LEVEL"] = "debug";
    const params = buildPinoParams();
    const pinoHttp = params.pinoHttp as {
      level: string;
      mixin: () => Record<string, unknown>;
      autoLogging: boolean;
    };

    expect(pinoHttp.level).toBe("debug");
    expect(pinoHttp.autoLogging).toBe(false);

    const mixed = runWithRequestLogStore({ requestId: "req-abc-12345" }, () =>
      runWithTenantStore({ tenantId: "tenant-1" }, () => pinoHttp.mixin()),
    );
    expect(mixed).toEqual({
      requestId: "req-abc-12345",
      tenantId: "tenant-1",
    });
  });
});
