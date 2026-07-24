import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ArrayNotEmpty, IsArray, IsString, IsUrl, MaxLength } from "class-validator";
import { CurrentUser, TenantId } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/auth.decorators";
import { Permissions } from "../../common/constants/permissions";
import type { JwtPayload } from "@propos/shared-types";
import { ApiKeysService, WebhooksService } from "./api-keys.service";

class CreateApiKeyDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  scopes!: string[];
}

class CreateWebhookDto {
  @IsUrl({ require_tld: false })
  url!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  events!: string[];
}

@Controller("platform-api")
export class PlatformApiController {
  constructor(
    private readonly keys: ApiKeysService,
    private readonly webhooks: WebhooksService,
  ) {}

  @Get("keys")
  @RequirePermissions(Permissions.ADMIN_USERS_READ)
  listKeys(@TenantId() tenantId: string) {
    return this.keys.list(tenantId);
  }

  @Post("keys")
  @RequirePermissions(Permissions.ADMIN_USERS_WRITE)
  createKey(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateApiKeyDto,
  ) {
    return this.keys.create(tenantId, dto.name, dto.scopes, user.userId);
  }

  @Post("keys/:id/rotate")
  @RequirePermissions(Permissions.ADMIN_USERS_WRITE)
  rotate(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
  ) {
    return this.keys.rotate(tenantId, id, user.userId);
  }

  @Delete("keys/:id")
  @RequirePermissions(Permissions.ADMIN_USERS_WRITE)
  revoke(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.keys.revoke(tenantId, id);
  }

  @Get("webhooks")
  @RequirePermissions(Permissions.ADMIN_USERS_READ)
  listHooks(@TenantId() tenantId: string) {
    return this.webhooks.listEndpoints(tenantId);
  }

  @Post("webhooks")
  @RequirePermissions(Permissions.ADMIN_USERS_WRITE)
  createHook(@TenantId() tenantId: string, @Body() dto: CreateWebhookDto) {
    return this.webhooks.createEndpoint(tenantId, dto.url, dto.events);
  }

  @Get("webhooks/:id/deliveries")
  @RequirePermissions(Permissions.ADMIN_USERS_READ)
  deliveries(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.webhooks.listDeliveries(tenantId, id);
  }
}
