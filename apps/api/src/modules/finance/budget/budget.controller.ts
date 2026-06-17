import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { TenantId } from "../../../common/decorators/current-user.decorator";
import { BudgetService } from "./budget.service";
import { CreateBudgetDto, FilterBudgetDto, UpdateBudgetDto } from "./dto/budget.dto";

@Controller("finance/budget")
export class BudgetController {
  constructor(private readonly service: BudgetService) {}

  @Get() findAll(@TenantId() tenantId: string, @Query() filter: FilterBudgetDto) { return this.service.findAll(tenantId, filter); }
  @Get(":id") findOne(@TenantId() tenantId: string, @Param("id") id: string) { return this.service.findOne(tenantId, id); }
  @Post() create(@TenantId() tenantId: string, @Body() dto: CreateBudgetDto) { return this.service.create(tenantId, dto); }
  @Patch(":id") update(@TenantId() tenantId: string, @Param("id") id: string, @Body() dto: UpdateBudgetDto) { return this.service.update(tenantId, id, dto); }
  @Delete(":id") remove(@TenantId() tenantId: string, @Param("id") id: string) { return this.service.remove(tenantId, id); }
}
