import { Controller, Get, Header, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { Public } from "../../decorators/auth.decorators";
import { MetricsAuthGuard } from "./metrics.guard";
import { MetricsService } from "./metrics.service";

/**
 * Prometheus scrape endpoint at `/metrics` (excluded from `/api/v1` prefix).
 * Guarded by METRICS_ENABLED + METRICS_TOKEN.
 */
@Controller("metrics")
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Public()
  @UseGuards(MetricsAuthGuard)
  @Get()
  @Header("Cache-Control", "no-store")
  async scrape(@Res({ passthrough: false }) res: Response): Promise<void> {
    const body = await this.metrics.metricsText();
    res.setHeader("Content-Type", this.metrics.contentType());
    res.status(200).send(body);
  }
}
