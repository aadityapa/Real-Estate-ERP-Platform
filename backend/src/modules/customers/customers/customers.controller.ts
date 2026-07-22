import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { TenantId } from "../../../common/decorators/current-user.decorator";
import { CustomersService } from "./customers.service";
import { CreateCustomerDto, FilterCustomerDto, UpdateCustomerDto } from "./dto/customer.dto";

@Controller("customers")
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Get() findAll(@TenantId() tenantId: string, @Query() filter: FilterCustomerDto) { return this.service.findAll(tenantId, filter); }
  @Get(":id/tickets") getTickets(@TenantId() tenantId: string, @Param("id") id: string) { return this.service.getTickets(tenantId, id); }
  @Get(":id") findOne(@TenantId() tenantId: string, @Param("id") id: string) { return this.service.findOne(tenantId, id); }
  @Post() create(@TenantId() tenantId: string, @Body() dto: CreateCustomerDto) { return this.service.create(tenantId, dto); }
  @Patch(":id") update(@TenantId() tenantId: string, @Param("id") id: string, @Body() dto: UpdateCustomerDto) { return this.service.update(tenantId, id, dto); }
  @Delete(":id") remove(@TenantId() tenantId: string, @Param("id") id: string) { return this.service.remove(tenantId, id); }
}
