import { Global, Module } from "@nestjs/common";
import { TenantLimitsService } from "./tenant-limits.service";
import { TenantUsageService } from "./tenant-usage.service";
import { TenantRateLimitGuard } from "./tenant-rate-limit.guard";
import { TenantQueueService } from "./tenant-queue.service";
import { FeatureFlagsGuard } from "./feature-flags.guard";

@Global()
@Module({
  providers: [
    TenantLimitsService,
    TenantUsageService,
    TenantRateLimitGuard,
    TenantQueueService,
    FeatureFlagsGuard,
  ],
  exports: [
    TenantLimitsService,
    TenantUsageService,
    TenantRateLimitGuard,
    TenantQueueService,
    FeatureFlagsGuard,
  ],
})
export class LimitsModule {}
