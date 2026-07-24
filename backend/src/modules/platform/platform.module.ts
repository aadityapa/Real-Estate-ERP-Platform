import { Module } from "@nestjs/common";
import { AuditModule } from "../../common/audit/audit.module";
import { PlatformAdminController } from "./platform-admin.controller";
import { PlatformAdminGuard } from "./platform-admin.guard";
import { PlatformAdminService } from "./platform-admin.service";
import { FeatureFlagService } from "./feature-flag.service";

@Module({
  imports: [AuditModule],
  controllers: [PlatformAdminController],
  providers: [PlatformAdminService, PlatformAdminGuard, FeatureFlagService],
  exports: [PlatformAdminService, FeatureFlagService],
})
export class PlatformModule {}
