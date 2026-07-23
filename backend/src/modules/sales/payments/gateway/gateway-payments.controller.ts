import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { TenantId } from "../../../../common/decorators/current-user.decorator";
import {
  Public,
  RequirePermissions,
} from "../../../../common/decorators/auth.decorators";
import { Permissions } from "../../../../common/constants/permissions";
import { GatewayPaymentsService } from "./gateway-payments.service";
import {
  ConfirmGatewayPaymentDto,
  CreateGatewayOrderDto,
  ReconciliationQueryDto,
  RefundGatewayPaymentDto,
} from "./dto/gateway-payment.dto";

type RawBodyRequest = Request & { rawBody?: Buffer };

@Controller("sales/payments/gateway")
export class GatewayPaymentsController {
  constructor(private readonly service: GatewayPaymentsService) {}

  @Post("orders")
  @RequirePermissions(Permissions.SALES_PAYMENTS_WRITE)
  createOrder(
    @TenantId() tenantId: string,
    @Body() dto: CreateGatewayOrderDto,
  ) {
    return this.service.createOrder(tenantId, dto);
  }

  @Post("confirm")
  @RequirePermissions(Permissions.SALES_PAYMENTS_WRITE)
  confirm(
    @TenantId() tenantId: string,
    @Body() dto: ConfirmGatewayPaymentDto,
  ) {
    return this.service.confirmCheckout(tenantId, dto);
  }

  @Public()
  @Post("webhook")
  webhook(
    @Req() req: RawBodyRequest,
    @Headers("x-razorpay-signature") signature: string | undefined,
  ) {
    const rawBody =
      req.rawBody?.toString("utf8") ??
      (typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body ?? {}));
    return this.service.handleWebhook(rawBody, signature);
  }

  @Get("reconciliation")
  @RequirePermissions(Permissions.SALES_PAYMENTS_READ)
  reconciliation(
    @TenantId() tenantId: string,
    @Query() query: ReconciliationQueryDto,
  ) {
    return this.service.reconciliation(tenantId, query.from, query.to);
  }

  @Post(":id/refund")
  @RequirePermissions(Permissions.SALES_PAYMENTS_WRITE)
  refund(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: RefundGatewayPaymentDto,
  ) {
    return this.service.refund(tenantId, id, dto);
  }
}
