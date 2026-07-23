import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { EventsModule } from "../../events/events.module";
import { GatewayPaymentsController } from "./gateway/gateway-payments.controller";
import { GatewayPaymentsService } from "./gateway/gateway-payments.service";
import { RazorpayGateway } from "./gateway/razorpay.gateway";
import { PAYMENT_GATEWAY } from "./gateway/payment-gateway.interface";

@Module({
  imports: [EventsModule],
  controllers: [GatewayPaymentsController, PaymentsController],
  providers: [
    PaymentsService,
    GatewayPaymentsService,
    RazorpayGateway,
    { provide: PAYMENT_GATEWAY, useExisting: RazorpayGateway },
  ],
  exports: [PaymentsService, GatewayPaymentsService],
})
export class PaymentsModule {}
