import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { TenantId } from "../../common/decorators/current-user.decorator";
import {
  Public,
  RequirePermissions,
} from "../../common/decorators/auth.decorators";
import { Permissions } from "../../common/constants/permissions";
import { BillingService } from "./billing.service";
import {
  CancelSubscriptionDto,
  ChangePlanDto,
  StartSubscriptionDto,
} from "./dto/billing.dto";

type RawBodyRequest = Request & { rawBody?: Buffer };

@Controller("billing")
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get("plans")
  @RequirePermissions(Permissions.ADMIN_BILLING_READ)
  listPlans() {
    return this.billing.listPlans();
  }

  @Get("subscription")
  @RequirePermissions(Permissions.ADMIN_BILLING_READ)
  getSubscription(@TenantId() tenantId: string) {
    return this.billing.getSubscription(tenantId);
  }

  @Get("invoices")
  @RequirePermissions(Permissions.ADMIN_BILLING_READ)
  listInvoices(@TenantId() tenantId: string) {
    return this.billing.listInvoices(tenantId);
  }

  @Post("subscribe")
  @RequirePermissions(Permissions.ADMIN_BILLING_WRITE)
  subscribe(
    @TenantId() tenantId: string,
    @Body() dto: StartSubscriptionDto,
  ) {
    return this.billing.startSubscription(tenantId, dto);
  }

  @Post("change-plan")
  @RequirePermissions(Permissions.ADMIN_BILLING_WRITE)
  changePlan(
    @TenantId() tenantId: string,
    @Body() dto: ChangePlanDto,
  ) {
    return this.billing.changePlan(tenantId, dto);
  }

  @Post("cancel")
  @RequirePermissions(Permissions.ADMIN_BILLING_WRITE)
  cancel(
    @TenantId() tenantId: string,
    @Body() dto: CancelSubscriptionDto,
  ) {
    return this.billing.cancel(tenantId, dto);
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
    return this.billing.handleWebhook(rawBody, signature);
  }
}
