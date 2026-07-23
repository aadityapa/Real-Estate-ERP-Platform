import { Module } from "@nestjs/common";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import { BillingAnalyticsService } from "./billing-analytics.service";
import { RazorpaySubscriptionGateway } from "./gateway/razorpay-subscription.gateway";
import { SUBSCRIPTION_GATEWAY } from "./gateway/subscription-gateway.interface";

@Module({
  controllers: [BillingController],
  providers: [
    BillingService,
    BillingAnalyticsService,
    RazorpaySubscriptionGateway,
    { provide: SUBSCRIPTION_GATEWAY, useExisting: RazorpaySubscriptionGateway },
  ],
  exports: [BillingService, BillingAnalyticsService],
})
export class BillingModule {}
