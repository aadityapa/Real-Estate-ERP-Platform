import { Module } from "@nestjs/common";
import { PurchaseOrdersModule } from "./purchase-orders/purchase-orders.module";

@Module({ imports: [PurchaseOrdersModule] })
export class ProcurementModule {}
