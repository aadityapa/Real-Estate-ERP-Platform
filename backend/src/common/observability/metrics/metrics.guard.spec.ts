import { UnauthorizedException, NotFoundException } from "@nestjs/common";
import { MetricsAuthGuard } from "./metrics.guard";
import type { MetricsService } from "./metrics.service";

function mockContext(auth?: string, tokenQuery?: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: auth ? { authorization: auth } : {},
        query: tokenQuery ? { token: tokenQuery } : {},
      }),
    }),
  } as never;
}

describe("MetricsAuthGuard", () => {
  it("returns 404 when metrics disabled", () => {
    const metrics = {
      isEnabled: () => false,
      getAccessToken: () => "secret",
    } as unknown as MetricsService;
    const guard = new MetricsAuthGuard(metrics);
    expect(() => guard.canActivate(mockContext("Bearer secret"))).toThrow(
      NotFoundException,
    );
  });

  it("accepts matching Bearer token", () => {
    const metrics = {
      isEnabled: () => true,
      getAccessToken: () => "secret",
    } as unknown as MetricsService;
    const guard = new MetricsAuthGuard(metrics);
    expect(guard.canActivate(mockContext("Bearer secret"))).toBe(true);
  });

  it("accepts matching query token", () => {
    const metrics = {
      isEnabled: () => true,
      getAccessToken: () => "secret",
    } as unknown as MetricsService;
    const guard = new MetricsAuthGuard(metrics);
    expect(guard.canActivate(mockContext(undefined, "secret"))).toBe(true);
  });

  it("rejects wrong token", () => {
    const metrics = {
      isEnabled: () => true,
      getAccessToken: () => "secret",
    } as unknown as MetricsService;
    const guard = new MetricsAuthGuard(metrics);
    expect(() => guard.canActivate(mockContext("Bearer nope"))).toThrow(
      UnauthorizedException,
    );
  });
});
