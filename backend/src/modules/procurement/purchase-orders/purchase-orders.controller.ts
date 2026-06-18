import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { TenantId } from "../../../common/decorators/current-user.decorator";
import { PurchaseOrdersService } from "./purchase-orders.service";
import { CreatePurchaseOrderDto, FilterPurchaseOrderDto, UpdatePurchaseOrderDto } from "./dto/purchase-order.dto";

@Controller("procurement/purchase-orders")
export class PurchaseOrdersController {
  constructor(private readonly service: PurchaseOrdersService) {}

  @Get() findAll(@TenantId() tenantId: string, @Query() filter: FilterPurchaseOrderDto) { return this.service.findAll(tenantId, filter); }
  @Get(":id") findOne(@TenantId() tenantId: string, @Param("id") id: string) { return this.service.findOne(tenantId, id); }
  @Post() create(@TenantId() tenantId: string, @Body() dto: CreatePurchaseOrderDto) { return this.service.create(tenantId, dto); }
  @Patch(":id") update(@TenantId() tenantId: string, @Param("id") id: string, @Body() dto: UpdatePurchaseOrderDto) { return this.service.update(tenantId, id, dto); }
  @Delete(":id") cancel(@TenantId() tenantId: string, @Param("id") id: string) { return this.service.cancel(tenantId, id); }
}
