import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { TenantId } from "../../../common/decorators/current-user.decorator";
import { MilestonesService } from "./milestones.service";
import { CreateMilestoneDto, FilterMilestoneDto, UpdateMilestoneDto } from "./dto/milestone.dto";

@Controller("construction/milestones")
export class MilestonesController {
  constructor(private readonly service: MilestonesService) {}

  @Get() findAll(@TenantId() tenantId: string, @Query() filter: FilterMilestoneDto) { return this.service.findAll(tenantId, filter); }
  @Get(":id") findOne(@TenantId() tenantId: string, @Param("id") id: string) { return this.service.findOne(tenantId, id); }
  @Post() create(@TenantId() tenantId: string, @Body() dto: CreateMilestoneDto) { return this.service.create(tenantId, dto); }
  @Patch(":id") update(@TenantId() tenantId: string, @Param("id") id: string, @Body() dto: UpdateMilestoneDto) { return this.service.update(tenantId, id, dto); }
  @Delete(":id") remove(@TenantId() tenantId: string, @Param("id") id: string) { return this.service.remove(tenantId, id); }
}
