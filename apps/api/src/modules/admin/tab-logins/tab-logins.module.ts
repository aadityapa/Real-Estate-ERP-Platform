import { Module } from "@nestjs/common";
import { TabLoginsController } from "./tab-logins.controller";
import { TabLoginsService } from "./tab-logins.service";

@Module({
  controllers: [TabLoginsController],
  providers: [TabLoginsService],
  exports: [TabLoginsService],
})
export class TabLoginsModule {}
