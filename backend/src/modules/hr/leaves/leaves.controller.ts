import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { TenantId } from "../../../common/decorators/current-user.decorator";
import { LeavesService } from "./leaves.service";
import { CreateLeaveDto, FilterLeaveDto, UpdateLeaveDto } from "./dto/leave.dto";

@Controller("hr/leaves")
export class LeavesController {
  constructor(private readonly service: LeavesService) {}

  @Get() findAll(@TenantId() tenantId: string, @Query() filter: FilterLeaveDto) { return this.service.findAll(tenantId, filter); }
  @Get(":id") findOne(@TenantId() tenantId: string, @Param("id") id: string) { return this.service.findOne(tenantId, id); }
  @Post() create(@TenantId() tenantId: string, @Body() dto: CreateLeaveDto) { return this.service.create(tenantId, dto); }
  @Patch(":id") update(@TenantId() tenantId: string, @Param("id") id: string, @Body() dto: UpdateLeaveDto) { return this.service.update(tenantId, id, dto); }
  @Delete(":id") remove(@TenantId() tenantId: string, @Param("id") id: string) { return this.service.remove(tenantId, id); }
}
