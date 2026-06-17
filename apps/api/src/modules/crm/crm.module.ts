import { Module } from "@nestjs/common";
import { LeadsModule } from "./leads/leads.module";
import { FollowUpsModule } from "./follow-ups/follow-ups.module";
import { SiteVisitsModule } from "./site-visits/site-visits.module";

@Module({
  imports: [LeadsModule, FollowUpsModule, SiteVisitsModule],
})
export class CrmModule {}
