import { Module } from "@nestjs/common";
import { LeadResolver } from "./resolvers/lead.resolver";
import { LeadsModule } from "../modules/crm/leads/leads.module";
import { BookingsModule } from "../modules/sales/bookings/bookings.module";

@Module({
  imports: [LeadsModule, BookingsModule],
  providers: [LeadResolver],
})
export class GraphqlFeatureModule {}
