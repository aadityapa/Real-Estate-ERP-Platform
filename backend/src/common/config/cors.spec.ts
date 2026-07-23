import { getCorsOrigins } from "./cors";

describe("getCorsOrigins", () => {
  const prev = {
    CORS_ORIGINS: process.env["CORS_ORIGINS"],
    FRONTEND_URL: process.env["FRONTEND_URL"],
  };

  afterEach(() => {
    if (prev.CORS_ORIGINS === undefined) delete process.env["CORS_ORIGINS"];
    else process.env["CORS_ORIGINS"] = prev.CORS_ORIGINS;
    if (prev.FRONTEND_URL === undefined) delete process.env["FRONTEND_URL"];
    else process.env["FRONTEND_URL"] = prev.FRONTEND_URL;
  });

  it("parses a comma-separated allowlist", () => {
    process.env["CORS_ORIGINS"] = "https://app.propos.in, https://admin.propos.in";
    delete process.env["FRONTEND_URL"];
    expect(getCorsOrigins()).toEqual([
      "https://app.propos.in",
      "https://admin.propos.in",
    ]);
  });

  it("never returns a bare wildcard", () => {
    process.env["CORS_ORIGINS"] = "*";
    delete process.env["FRONTEND_URL"];
    expect(getCorsOrigins()).toBe("http://localhost:3000");
  });
});
