import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { TenantId } from "../../../common/decorators/current-user.decorator";
import { AttendanceService } from "./attendance.service";
import { CreateAttendanceDto, FilterAttendanceDto, UpdateAttendanceDto } from "./dto/attendance.dto";

@Controller("hr/attendance")
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Get() findAll(@TenantId() tenantId: string, @Query() filter: FilterAttendanceDto) { return this.service.findAll(tenantId, filter); }
  @Get(":id") findOne(@TenantId() tenantId: string, @Param("id") id: string) { return this.service.findOne(tenantId, id); }
  @Post() create(@TenantId() tenantId: string, @Body() dto: CreateAttendanceDto) { return this.service.create(tenantId, dto); }
  @Patch(":id") update(@TenantId() tenantId: string, @Param("id") id: string, @Body() dto: UpdateAttendanceDto) { return this.service.update(tenantId, id, dto); }
  @Delete(":id") remove(@TenantId() tenantId: string, @Param("id") id: string) { return this.service.remove(tenantId, id); }
}
