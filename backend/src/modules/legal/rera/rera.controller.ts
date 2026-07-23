import { Body, Controller, Get, Param, Patch, Post, Put } from "@nestjs/common";
import { TenantId } from "../../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../../common/decorators/auth.decorators";
import { Permissions } from "../../../common/constants/permissions";
import { ReraService } from "./rera.service";
import {
  CheckReraPaymentDto,
  PatchReraPaymentStageDto,
  ReplaceReraPaymentStagesDto,
  UpsertReraProfileDto,
} from "./dto/rera.dto";

@Controller("legal/rera")
export class ReraController {
  constructor(private readonly service: ReraService) {}

  @Get("projects/:projectId")
  @RequirePermissions(Permissions.LEGAL_RERA_READ)
  getProfile(
    @TenantId() tenantId: string,
    @Param("projectId") projectId: string,
  ) {
    return this.service.getProfile(tenantId, projectId);
  }

  @Put("projects/:projectId")
  @RequirePermissions(Permissions.LEGAL_RERA_WRITE)
  upsertProfile(
    @TenantId() tenantId: string,
    @Param("projectId") projectId: string,
    @Body() dto: UpsertReraProfileDto,
  ) {
    return this.service.upsertProfile(tenantId, projectId, dto);
  }

  @Get("projects/:projectId/stages")
  @RequirePermissions(Permissions.LEGAL_RERA_READ)
  listStages(
    @TenantId() tenantId: string,
    @Param("projectId") projectId: string,
  ) {
    return this.service.listStages(tenantId, projectId);
  }

  @Put("projects/:projectId/stages")
  @RequirePermissions(Permissions.LEGAL_RERA_WRITE)
  replaceStages(
    @TenantId() tenantId: string,
    @Param("projectId") projectId: string,
    @Body() dto: ReplaceReraPaymentStagesDto,
  ) {
    return this.service.replaceStages(tenantId, projectId, dto);
  }

  @Patch("projects/:projectId/stages/:stageId")
  @RequirePermissions(Permissions.LEGAL_RERA_WRITE)
  patchStage(
    @TenantId() tenantId: string,
    @Param("projectId") projectId: string,
    @Param("stageId") stageId: string,
    @Body() dto: PatchReraPaymentStageDto,
  ) {
    return this.service.patchStage(tenantId, projectId, stageId, dto);
  }

  @Post("projects/:projectId/check-payment")
  @RequirePermissions(Permissions.LEGAL_RERA_READ)
  checkPayment(
    @TenantId() tenantId: string,
    @Param("projectId") projectId: string,
    @Body() dto: CheckReraPaymentDto,
  ) {
    return this.service.checkPayment(tenantId, projectId, dto);
  }

  @Get("projects/:projectId/compliance")
  @RequirePermissions(Permissions.LEGAL_RERA_READ)
  compliance(
    @TenantId() tenantId: string,
    @Param("projectId") projectId: string,
  ) {
    return this.service.complianceReport(tenantId, projectId);
  }
}
