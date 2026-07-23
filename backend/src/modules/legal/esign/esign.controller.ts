import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import {
  CurrentUser,
  TenantId,
} from "../../../common/decorators/current-user.decorator";
import {
  Public,
  RequirePermissions,
} from "../../../common/decorators/auth.decorators";
import { Permissions } from "../../../common/constants/permissions";
import type { JwtPayload } from "@propos/shared-types";
import { ESignService } from "./esign.service";
import { CreateESignRequestDto } from "./dto/esign.dto";

type RawBodyRequest = Request & { rawBody?: Buffer };

@Controller("legal/esign")
export class ESignController {
  constructor(private readonly service: ESignService) {}

  /** Provider webhook — must be registered before `:id` routes. */
  @Public()
  @Post("webhook")
  webhook(
    @Req() req: RawBodyRequest,
    @Headers("x-esign-signature") signature: string | undefined,
  ) {
    const rawBody =
      req.rawBody?.toString("utf8") ??
      (typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body ?? {}));
    return this.service.handleWebhook(rawBody, signature);
  }

  @Get()
  @RequirePermissions(Permissions.LEGAL_ESIGN_READ)
  findAll(
    @TenantId() tenantId: string,
    @Query("documentId") documentId?: string,
  ) {
    return this.service.findAll(tenantId, documentId);
  }

  @Post()
  @RequirePermissions(Permissions.LEGAL_ESIGN_WRITE)
  create(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateESignRequestDto,
  ) {
    return this.service.create(tenantId, user.userId, dto);
  }

  @Get(":id")
  @RequirePermissions(Permissions.LEGAL_ESIGN_READ)
  findOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.service.findOne(tenantId, id);
  }
}
