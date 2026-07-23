import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { TenantId } from "../../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../../common/decorators/auth.decorators";
import { Permissions } from "../../../common/constants/permissions";
import { LeavesService } from "./leaves.service";
import { CreateLeaveDto, FilterLeaveDto, UpdateLeaveDto } from "./dto/leave.dto";

@Controller("hr/leaves")
export class LeavesController {
  constructor(private readonly service: LeavesService) {}

  @Get()
  @RequirePermissions(Permissions.HR_LEAVES_READ)
  findAll(@TenantId() tenantId: string, @Query() filter: FilterLeaveDto) {
    return this.service.findAll(tenantId, filter);
  }

  @Get(":id")
  @RequirePermissions(Permissions.HR_LEAVES_READ)
  findOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Post()
  @RequirePermissions(Permissions.HR_LEAVES_WRITE)
  create(@TenantId() tenantId: string, @Body() dto: CreateLeaveDto) {
    return this.service.create(tenantId, dto);
  }

  @Patch(":id")
  @RequirePermissions(Permissions.HR_LEAVES_WRITE)
  update(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: UpdateLeaveDto,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(":id")
  @RequirePermissions(Permissions.HR_LEAVES_WRITE)
  remove(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.service.remove(tenantId, id);
  }
}
