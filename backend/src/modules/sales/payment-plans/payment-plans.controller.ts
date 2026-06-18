import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { TenantId } from "../../../common/decorators/current-user.decorator";
import { PaymentPlansService } from "./payment-plans.service";
import {
  CreatePaymentPlanDto,
  FilterPaymentPlanDto,
} from "./dto/payment-plan.dto";

@Controller("sales/payment-plans")
export class PaymentPlansController {
  constructor(private readonly service: PaymentPlansService) {}

  @Get()
  findAll(@TenantId() tenantId: string, @Query() filter: FilterPaymentPlanDto) {
    return this.service.findAll(tenantId, filter);
  }

  @Get(":id")
  findOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreatePaymentPlanDto) {
    return this.service.create(tenantId, dto);
  }
}
