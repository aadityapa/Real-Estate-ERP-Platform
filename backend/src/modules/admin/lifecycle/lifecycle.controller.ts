import { Controller, Delete, Get, Body, Header } from "@nestjs/common";
import { TenantId } from "../../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../../common/decorators/auth.decorators";
import { Permissions } from "../../../common/constants/permissions";
import { LifecycleService } from "./lifecycle.service";
import { HardDeleteTenantDto } from "./dto/hard-delete.dto";

@Controller("admin/lifecycle")
export class LifecycleController {
  constructor(private readonly lifecycle: LifecycleService) {}

  /**
   * DPDP / GDPR data-portability export for the authenticated tenant.
   */
  @Get("export")
  @RequirePermissions(Permissions.ADMIN_LIFECYCLE_EXPORT)
  @Header("Content-Type", "application/json")
  export(@TenantId() tenantId: string) {
    return this.lifecycle.exportTenant(tenantId);
  }

  /**
   * Right-to-erasure hard delete for the authenticated tenant.
   * Irreversible — requires confirmSlug matching tenant.slug.
   */
  @Delete()
  @RequirePermissions(Permissions.ADMIN_LIFECYCLE_DELETE)
  hardDelete(
    @TenantId() tenantId: string,
    @Body() dto: HardDeleteTenantDto,
  ) {
    return this.lifecycle.hardDeleteTenant(tenantId, dto.confirmSlug);
  }
}
