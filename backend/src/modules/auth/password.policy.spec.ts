import {
  passwordEntropyBits,
  validatePasswordStrength,
  BCRYPT_COST,
} from "./password.policy";
import {
  assertJwtSecretsConfigured,
  JWT_SECRET_PLACEHOLDERS,
} from "./jwt-secrets";

describe("password.policy", () => {
  it("requires bcrypt cost >= 12", () => {
    expect(BCRYPT_COST).toBeGreaterThanOrEqual(12);
  });

  it("rejects short or low-entropy passwords", () => {
    expect(validatePasswordStrength("short")).toMatch(/at least/i);
    expect(validatePasswordStrength("aaaaaaaaaaaa")).toBeTruthy();
    expect(validatePasswordStrength("Password1!")).toMatch(/at least/i);
  });

  it("accepts a strong passphrase", () => {
    expect(validatePasswordStrength("Tr0ub4dor&3!xY")).toBeNull();
    expect(passwordEntropyBits("Tr0ub4dor&3!xY")).toBeGreaterThan(40);
  });
});

describe("jwt-secrets / production-secrets", () => {
  it("fails when secrets are missing", () => {
    expect(() =>
      assertJwtSecretsConfigured({ NODE_ENV: "development" }),
    ).toThrow(/JWT_SECRET/);
  });

  it("fails in production when secrets match .env.example placeholders", () => {
    expect(() =>
      assertJwtSecretsConfigured({
        NODE_ENV: "production",
        JWT_SECRET: JWT_SECRET_PLACEHOLDERS[0],
        JWT_REFRESH_SECRET: "real-refresh-secret-value-here",
      }),
    ).toThrow(/placeholder/);
  });

  it("allows placeholders outside production", () => {
    expect(() =>
      assertJwtSecretsConfigured({
        NODE_ENV: "development",
        JWT_SECRET: JWT_SECRET_PLACEHOLDERS[0],
        JWT_REFRESH_SECRET: JWT_SECRET_PLACEHOLDERS[1],
      }),
    ).not.toThrow();
  });
});
