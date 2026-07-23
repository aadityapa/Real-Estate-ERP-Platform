import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { TenantId } from "../../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../../common/decorators/auth.decorators";
import { Permissions } from "../../../common/constants/permissions";
import { EmployeesService } from "./employees.service";
import { CreateEmployeeDto, FilterEmployeeDto, UpdateEmployeeDto } from "./dto/employee.dto";

@Controller("hr/employees")
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  @Get()
  @RequirePermissions(Permissions.HR_EMPLOYEES_READ)
  findAll(@TenantId() tenantId: string, @Query() filter: FilterEmployeeDto) {
    return this.service.findAll(tenantId, filter);
  }

  @Get(":id")
  @RequirePermissions(Permissions.HR_EMPLOYEES_READ)
  findOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Post()
  @RequirePermissions(Permissions.HR_EMPLOYEES_WRITE)
  create(@TenantId() tenantId: string, @Body() dto: CreateEmployeeDto) {
    return this.service.create(tenantId, dto);
  }

  @Patch(":id")
  @RequirePermissions(Permissions.HR_EMPLOYEES_WRITE)
  update(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(":id")
  @RequirePermissions(Permissions.HR_EMPLOYEES_WRITE)
  archive(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.service.archive(tenantId, id);
  }
}
