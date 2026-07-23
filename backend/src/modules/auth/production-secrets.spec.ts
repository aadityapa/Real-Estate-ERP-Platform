import {
  assertProductionSecretsConfigured,
  SECRET_PLACEHOLDERS,
} from "./production-secrets";

describe("assertProductionSecretsConfigured", () => {
  const real = {
    JWT_SECRET: "prod-jwt-secret-not-a-placeholder-value",
    JWT_REFRESH_SECRET: "prod-refresh-secret-not-a-placeholder",
    STORAGE_URL_SECRET: "prod-storage-secret-not-a-placeholder",
    PII_ENCRYPTION_KEY: Buffer.alloc(32, 9).toString("base64"),
  };

  it("requires JWT secrets even outside production", () => {
    expect(() =>
      assertProductionSecretsConfigured({ NODE_ENV: "development" }),
    ).toThrow(/JWT_SECRET/);
  });

  it("allows placeholders in development", () => {
    expect(() =>
      assertProductionSecretsConfigured({
        NODE_ENV: "development",
        JWT_SECRET: SECRET_PLACEHOLDERS.JWT_SECRET,
        JWT_REFRESH_SECRET: SECRET_PLACEHOLDERS.JWT_REFRESH_SECRET,
      }),
    ).not.toThrow();
  });

  it("refuses production boot when any secret equals its placeholder", () => {
    expect(() =>
      assertProductionSecretsConfigured({
        NODE_ENV: "production",
        ...real,
        STORAGE_URL_SECRET: SECRET_PLACEHOLDERS.STORAGE_URL_SECRET,
      }),
    ).toThrow(/STORAGE_URL_SECRET/);

    expect(() =>
      assertProductionSecretsConfigured({
        NODE_ENV: "production",
        ...real,
        PII_ENCRYPTION_KEY: SECRET_PLACEHOLDERS.PII_ENCRYPTION_KEY,
      }),
    ).toThrow(/PII_ENCRYPTION_KEY/);
  });

  it("refuses production boot when PII_ENCRYPTION_KEY is missing", () => {
    expect(() =>
      assertProductionSecretsConfigured({
        NODE_ENV: "production",
        JWT_SECRET: real.JWT_SECRET,
        JWT_REFRESH_SECRET: real.JWT_REFRESH_SECRET,
        STORAGE_URL_SECRET: real.STORAGE_URL_SECRET,
      }),
    ).toThrow(/PII_ENCRYPTION_KEY/);
  });

  it("accepts fully configured production secrets", () => {
    expect(() =>
      assertProductionSecretsConfigured({
        NODE_ENV: "production",
        ...real,
      }),
    ).not.toThrow();
  });
});
