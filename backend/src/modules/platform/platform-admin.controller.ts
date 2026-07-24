import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { JwtPayload } from "@propos/shared-types";
import { PlatformAdminGuard } from "./platform-admin.guard";
import { PlatformAdminService } from "./platform-admin.service";

class UpdateTenantDto {
  @IsOptional()
  @IsEnum(["STARTER", "GROWTH", "ENTERPRISE"])
  plan?: "STARTER" | "GROWTH" | "ENTERPRISE";

  @IsOptional()
  @IsEnum(["ACTIVE", "INACTIVE", "ARCHIVED"])
  status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";

  @IsOptional()
  @IsBoolean()
  ssoOnly?: boolean;
}

class UpsertFlagDto {
  @IsString()
  @MaxLength(64)
  key!: string;

  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

class StartImpersonationDto {
  @IsString()
  tenantId!: string;

  @IsString()
  targetUserId!: string;
}

@Controller("platform")
@UseGuards(PlatformAdminGuard)
export class PlatformAdminController {
  constructor(private readonly platform: PlatformAdminService) {}

  @Get("tenants")
  listTenants() {
    return this.platform.listTenants();
  }

  @Patch("tenants/:id")
  updateTenant(@Param("id") id: string, @Body() dto: UpdateTenantDto) {
    return this.platform.updateTenant(id, dto);
  }

  @Get("audit-logs")
  auditLogs(
    @Query("tenantId") tenantId?: string,
    @Query("limit") limit?: string,
  ) {
    return this.platform.listAuditLogs(
      tenantId,
      limit ? Number(limit) : 50,
    );
  }

  @Get("feature-flags")
  flags(@Query("tenantId") tenantId?: string) {
    return this.platform.listFlags(tenantId);
  }

  @Post("feature-flags")
  upsertFlag(@Body() dto: UpsertFlagDto) {
    return this.platform.upsertFlag({
      key: dto.key,
      enabled: dto.enabled,
      tenantId: dto.tenantId ?? null,
      description: dto.description,
    });
  }

  @Post("impersonation/start")
  start(
    @CurrentUser() user: JwtPayload,
    @Body() dto: StartImpersonationDto,
  ) {
    return this.platform.startImpersonation(
      user.userId,
      dto.tenantId,
      dto.targetUserId,
    );
  }

  @Post("impersonation/:sessionId/end")
  end(
    @CurrentUser() user: JwtPayload,
    @Param("sessionId") sessionId: string,
  ) {
    return this.platform.endImpersonation(user.userId, sessionId);
  }
}
