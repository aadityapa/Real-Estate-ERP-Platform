import { Module } from "@nestjs/common";
import { CustomersFeatureModule } from "./customers/customers.module";

@Module({ imports: [CustomersFeatureModule] })
export class CustomersModule {}
