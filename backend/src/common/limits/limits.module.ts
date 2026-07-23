import { Global, Module } from "@nestjs/common";
import { TenantLimitsService } from "./tenant-limits.service";
import { TenantUsageService } from "./tenant-usage.service";
import { TenantRateLimitGuard } from "./tenant-rate-limit.guard";
import { TenantQueueService } from "./tenant-queue.service";

@Global()
@Module({
  providers: [
    TenantLimitsService,
    TenantUsageService,
    TenantRateLimitGuard,
    TenantQueueService,
  ],
  exports: [
    TenantLimitsService,
    TenantUsageService,
    TenantRateLimitGuard,
    TenantQueueService,
  ],
})
export class LimitsModule {}
