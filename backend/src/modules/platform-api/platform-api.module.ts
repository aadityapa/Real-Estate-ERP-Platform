import { Module } from "@nestjs/common";
import { ApiKeysService, WebhooksService } from "./api-keys.service";
import { PlatformApiController } from "./platform-api.controller";
import { ApiKeyAuthGuard } from "./api-key-auth.guard";

@Module({
  controllers: [PlatformApiController],
  providers: [ApiKeysService, WebhooksService, ApiKeyAuthGuard],
  exports: [ApiKeysService, WebhooksService, ApiKeyAuthGuard],
})
export class PlatformApiModule {}
