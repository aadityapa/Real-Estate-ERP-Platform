import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { TenantId } from "../../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../../common/decorators/auth.decorators";
import { Permissions } from "../../../common/constants/permissions";
import { BudgetService } from "./budget.service";
import { CreateBudgetDto, FilterBudgetDto, UpdateBudgetDto } from "./dto/budget.dto";

@Controller("finance/budget")
export class BudgetController {
  constructor(private readonly service: BudgetService) {}

  @Get()
  @RequirePermissions(Permissions.FINANCE_BUDGET_READ)
  findAll(@TenantId() tenantId: string, @Query() filter: FilterBudgetDto) {
    return this.service.findAll(tenantId, filter);
  }

  @Get(":id")
  @RequirePermissions(Permissions.FINANCE_BUDGET_READ)
  findOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Post()
  @RequirePermissions(Permissions.FINANCE_BUDGET_WRITE)
  create(@TenantId() tenantId: string, @Body() dto: CreateBudgetDto) {
    return this.service.create(tenantId, dto);
  }

  @Patch(":id")
  @RequirePermissions(Permissions.FINANCE_BUDGET_WRITE)
  update(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(":id")
  @RequirePermissions(Permissions.FINANCE_BUDGET_WRITE)
  remove(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.service.remove(tenantId, id);
  }
}
