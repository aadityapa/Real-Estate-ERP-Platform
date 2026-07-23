import { initSentry, isSentryEnabled, captureException } from "./sentry";

describe("sentry", () => {
  const prevDsn = process.env["SENTRY_DSN"];

  afterEach(() => {
    if (prevDsn === undefined) delete process.env["SENTRY_DSN"];
    else process.env["SENTRY_DSN"] = prevDsn;
  });

  it("is a no-op without SENTRY_DSN", () => {
    delete process.env["SENTRY_DSN"];
    initSentry();
    expect(isSentryEnabled()).toBe(false);
    expect(() => captureException(new Error("x"))).not.toThrow();
  });
});
