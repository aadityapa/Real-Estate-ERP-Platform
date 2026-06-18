import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { TenantId } from "../../../common/decorators/current-user.decorator";
import { EmployeesService } from "./employees.service";
import { CreateEmployeeDto, FilterEmployeeDto, UpdateEmployeeDto } from "./dto/employee.dto";

@Controller("hr/employees")
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  @Get() findAll(@TenantId() tenantId: string, @Query() filter: FilterEmployeeDto) { return this.service.findAll(tenantId, filter); }
  @Get(":id") findOne(@TenantId() tenantId: string, @Param("id") id: string) { return this.service.findOne(tenantId, id); }
  @Post() create(@TenantId() tenantId: string, @Body() dto: CreateEmployeeDto) { return this.service.create(tenantId, dto); }
  @Patch(":id") update(@TenantId() tenantId: string, @Param("id") id: string, @Body() dto: UpdateEmployeeDto) { return this.service.update(tenantId, id, dto); }
  @Delete(":id") archive(@TenantId() tenantId: string, @Param("id") id: string) { return this.service.archive(tenantId, id); }
}
