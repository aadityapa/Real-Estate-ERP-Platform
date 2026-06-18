import { Module } from "@nestjs/common";
import { InventoryModule } from "./inventory/inventory.module";
import { BookingsModule } from "./bookings/bookings.module";
import { PaymentPlansModule } from "./payment-plans/payment-plans.module";
import { PaymentsModule } from "./payments/payments.module";

@Module({
  imports: [InventoryModule, BookingsModule, PaymentPlansModule, PaymentsModule],
})
export class SalesModule {}
