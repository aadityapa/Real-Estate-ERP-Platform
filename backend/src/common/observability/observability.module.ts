import { Module } from "@nestjs/common";
import { LoggerModule } from "nestjs-pino";
import { DatabaseModule } from "../../database/database.module";
import { LimitsModule } from "../limits/limits.module";
import { buildPinoParams } from "./pino.config";
import { MetricsController } from "./metrics/metrics.controller";
import { MetricsService } from "./metrics/metrics.service";
import { MetricsAuthGuard } from "./metrics/metrics.guard";

@Module({
  imports: [
    LoggerModule.forRoot(buildPinoParams()),
    DatabaseModule,
    LimitsModule,
  ],
  controllers: [MetricsController],
  providers: [MetricsService, MetricsAuthGuard],
  exports: [MetricsService, LoggerModule],
})
export class ObservabilityModule {}
