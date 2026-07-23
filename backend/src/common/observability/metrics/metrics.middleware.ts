import type { Request, Response, NextFunction } from "express";
import type { MetricsService } from "./metrics.service";

/**
 * Record HTTP request rate / latency / status for Prometheus.
 * Skips /health and /metrics to avoid scrape noise.
 */
export function metricsHttpMiddleware(metrics: MetricsService) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!metrics.isEnabled()) {
      next();
      return;
    }
    const path = req.originalUrl ?? req.url;
    if (
      path.startsWith("/api/v1/health") ||
      path.startsWith("/metrics") ||
      path === "/favicon.ico"
    ) {
      next();
      return;
    }

    const started = process.hrtime.bigint();
    res.on("finish", () => {
      const durationNs = Number(process.hrtime.bigint() - started);
      const durationSeconds = durationNs / 1e9;
      const route = (req.route?.path as string | undefined) ?? path.split("?")[0] ?? path;
      metrics.observeHttp(req.method, route, res.statusCode, durationSeconds);
    });
    next();
  };
}
