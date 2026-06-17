import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { TabLoginsService } from "./tab-logins.service";
import { TenantId } from "../../../common/decorators/current-user.decorator";

@Controller("admin/tab-logins")
export class TabLoginsController {
  constructor(private readonly service: TabLoginsService) {}

  @Get()
  findAll(@TenantId() tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Post()
  create(
    @TenantId() tenantId: string,
    @Body()
    body: {
      roleId: string;
      tabId: string;
      label: string;
      allowedTabs: string[];
      defaultTab: string;
      theme?: string;
    },
  ) {
    return this.service.create(tenantId, body);
  }

  @Patch(":id")
  update(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body()
    body: Partial<{
      tabId: string;
      label: string;
      allowedTabs: string[];
      defaultTab: string;
      theme: string;
    }>,
  ) {
    return this.service.update(tenantId, id, body);
  }

  @Delete(":id")
  remove(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.service.remove(tenantId, id);
  }
}
