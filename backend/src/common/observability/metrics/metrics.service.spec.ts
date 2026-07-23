import { MetricsService } from "./metrics.service";
import type { ConfigService } from "@nestjs/config";
import type { PrismaService } from "../../../database/prisma.service";
import type { TenantQueueService } from "../../limits/tenant-queue.service";

describe("MetricsService", () => {
  function createService(enabled: boolean): MetricsService {
    const config = {
      get: (key: string) => {
        if (key === "METRICS_ENABLED") return enabled ? "true" : "false";
        if (key === "METRICS_TOKEN") return "tok";
        return undefined;
      },
    } as unknown as ConfigService;

    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([]),
    } as unknown as PrismaService;

    const queue = {
      getJobCounts: jest.fn().mockResolvedValue({
        waiting: 2,
        active: 1,
        delayed: 0,
        completed: 0,
        failed: 0,
      }),
    } as unknown as TenantQueueService;

    return new MetricsService(config, prisma, queue);
  }

  it("is no-op for observeHttp when disabled", async () => {
    const svc = createService(false);
    svc.observeHttp("GET", "/api/v1/x", 200, 0.01);
    const text = await svc.metricsText();
    expect(text).not.toContain('propos_http_requests_total{method="GET"');
  });

  it("records HTTP counters when enabled", async () => {
    const svc = createService(true);
    svc.observeHttp("GET", "/api/v1/crm/leads", 200, 0.05);
    svc.observeHttp("GET", "/api/v1/crm/leads", 500, 0.2);
    const text = await svc.metricsText();
    expect(text).toContain("propos_http_requests_total");
    expect(text).toContain('status_code="200"');
    expect(text).toContain('status_code="500"');
    expect(text).toContain("propos_nodejs_eventloop_lag_seconds");
    expect(text).toContain("propos_queue_depth");
  });
});
