import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { TabLoginsService } from "./tab-logins.service";
import { TenantId } from "../../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../../common/decorators/auth.decorators";
import { Permissions } from "../../../common/constants/permissions";
import { CreateTabLoginDto, UpdateTabLoginDto } from "./dto/tab-login.dto";

@Controller("admin/tab-logins")
export class TabLoginsController {
  constructor(private readonly service: TabLoginsService) {}

  @Get()
  @RequirePermissions(Permissions.ADMIN_TAB_LOGINS_WRITE)
  findAll(@TenantId() tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Post()
  @RequirePermissions(Permissions.ADMIN_TAB_LOGINS_WRITE)
  create(@TenantId() tenantId: string, @Body() body: CreateTabLoginDto) {
    return this.service.create(tenantId, body);
  }

  @Patch(":id")
  @RequirePermissions(Permissions.ADMIN_TAB_LOGINS_WRITE)
  update(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() body: UpdateTabLoginDto,
  ) {
    return this.service.update(tenantId, id, body);
  }

  @Delete(":id")
  @RequirePermissions(Permissions.ADMIN_TAB_LOGINS_WRITE)
  remove(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.service.remove(tenantId, id);
  }
}
