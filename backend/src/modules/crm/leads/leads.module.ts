import { Module } from "@nestjs/common";
import { LeadsController } from "./leads.controller";
import { LeadsService } from "./leads.service";
import { EventsModule } from "../../events/events.module";
import { PlatformApiModule } from "../../platform-api/platform-api.module";

@Module({
  imports: [EventsModule, PlatformApiModule],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
