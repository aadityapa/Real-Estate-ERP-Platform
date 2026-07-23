import { redactForLog, redactHeaders } from "./redact";

describe("redactForLog", () => {
  it("redacts secrets and PII field values", () => {
    const out = redactForLog({
      password: "secret",
      email: "a@b.co",
      phone: "9999999999",
      nested: { refreshToken: "tok", ok: true },
    }) as Record<string, unknown>;

    expect(out["password"]).toBe("[REDACTED]");
    expect(out["email"]).toBe("[REDACTED]");
    expect(out["phone"]).toBe("[REDACTED]");
    expect((out["nested"] as Record<string, unknown>)["refreshToken"]).toBe(
      "[REDACTED]",
    );
    expect((out["nested"] as Record<string, unknown>)["ok"]).toBe(true);
  });

  it("redacts authorization headers", () => {
    const headers = redactHeaders({
      authorization: "Bearer abc.def",
      "user-agent": "jest",
    });
    expect(headers["authorization"]).toBe("[REDACTED]");
    expect(headers["user-agent"]).toBe("jest");
  });
});
