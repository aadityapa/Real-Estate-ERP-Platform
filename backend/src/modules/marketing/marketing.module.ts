import { Module } from "@nestjs/common";
import { CampaignsModule } from "./campaigns/campaigns.module";

@Module({ imports: [CampaignsModule] })
export class MarketingModule {}
