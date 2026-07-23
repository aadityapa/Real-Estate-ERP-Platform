import { Body, Controller, Get, Patch } from "@nestjs/common";
import { TenantId } from "../../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../../common/decorators/auth.decorators";
import { Permissions } from "../../../common/constants/permissions";
import { TenantLimitsService } from "../../../common/limits/tenant-limits.service";
import { TenantUsageService } from "../../../common/limits/tenant-usage.service";
import { TenantQueueService } from "../../../common/limits/tenant-queue.service";
import { UpdateTenantLimitsDto } from "./dto/update-limits.dto";

@Controller("admin/usage")
export class UsageController {
  constructor(
    private readonly limits: TenantLimitsService,
    private readonly usage: TenantUsageService,
    private readonly queue: TenantQueueService,
  ) {}

  /**
   * Usage + effective limits for the caller's tenant.
   * Basis for Phase 5 plan/billing dashboards.
   */
  @Get()
  @RequirePermissions(Permissions.ADMIN_USAGE_READ)
  async getUsage(@TenantId() tenantId: string) {
    const [snapshot, usage, queueActive] = await Promise.all([
      this.limits.getEffectiveLimits(tenantId),
      this.usage.getUsage(tenantId),
      this.queue.getActiveCount(tenantId),
    ]);

    return {
      tenantId: snapshot.tenantId,
      plan: snapshot.plan,
      limits: {
        ...snapshot.limits,
        // Serialize BigInt-safe numbers only (already numbers on EffectiveTenantLimits).
      },
      overrides: snapshot.overrides
        ? {
            ...snapshot.overrides,
            maxStorageBytes:
              snapshot.overrides.maxStorageBytes != null
                ? Number(snapshot.overrides.maxStorageBytes)
                : null,
          }
        : null,
      usage: {
        ...usage,
        queueActiveJobs: queueActive,
      },
    };
  }

  @Patch("limits")
  @RequirePermissions(Permissions.ADMIN_USAGE_WRITE)
  async updateLimits(
    @TenantId() tenantId: string,
    @Body() dto: UpdateTenantLimitsDto,
  ) {
    const snapshot = await this.limits.upsertOverrides(tenantId, dto);
    return {
      tenantId: snapshot.tenantId,
      plan: snapshot.plan,
      limits: snapshot.limits,
      overrides: snapshot.overrides
        ? {
            ...snapshot.overrides,
            maxStorageBytes:
              snapshot.overrides.maxStorageBytes != null
                ? Number(snapshot.overrides.maxStorageBytes)
                : null,
          }
        : null,
    };
  }
}
