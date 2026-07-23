import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import {
  CurrentUser,
  TenantId,
} from "../../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../../common/decorators/auth.decorators";
import { Permissions } from "../../../common/constants/permissions";
import type { JwtPayload } from "@propos/shared-types";
import { AgreementsService } from "./agreements.service";
import {
  AgreementTypeDto,
  CreateAgreementTemplateDto,
  GenerateFromTemplateDto,
  UpdateAgreementTemplateDto,
} from "./dto/agreement-template.dto";
import { IsEnum, IsOptional } from "class-validator";
import { AgreementType } from "@prisma/client";

class FilterTemplatesQuery {
  @IsOptional()
  @IsEnum(AgreementTypeDto)
  type?: AgreementTypeDto;
}

@Controller("legal/agreements")
export class AgreementsController {
  constructor(private readonly service: AgreementsService) {}

  @Get("templates")
  @RequirePermissions(Permissions.LEGAL_AGREEMENTS_READ)
  listTemplates(
    @TenantId() tenantId: string,
    @Query() query: FilterTemplatesQuery,
  ) {
    return this.service.listTemplates(
      tenantId,
      query.type as AgreementType | undefined,
    );
  }

  @Get("templates/:id")
  @RequirePermissions(Permissions.LEGAL_AGREEMENTS_READ)
  getTemplate(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.service.getTemplate(tenantId, id);
  }

  @Post("templates")
  @RequirePermissions(Permissions.LEGAL_AGREEMENTS_WRITE)
  createTemplate(
    @TenantId() tenantId: string,
    @Body() dto: CreateAgreementTemplateDto,
  ) {
    return this.service.createTemplate(tenantId, dto);
  }

  @Patch("templates/:id")
  @RequirePermissions(Permissions.LEGAL_AGREEMENTS_WRITE)
  updateTemplate(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: UpdateAgreementTemplateDto,
  ) {
    return this.service.updateTemplate(tenantId, id, dto);
  }

  @Post("generate")
  @RequirePermissions(Permissions.LEGAL_AGREEMENTS_WRITE)
  generate(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: GenerateFromTemplateDto,
  ) {
    return this.service.generateFromBooking(tenantId, user.userId, dto);
  }
}
