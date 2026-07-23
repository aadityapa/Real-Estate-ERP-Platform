import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { LmsLeadsService } from "./lms-leads.service";
import { TenantId, CurrentUser } from "../../../common/decorators/current-user.decorator";
import type { JwtPayload } from "@propos/shared-types";
import { DismissLeadDto, UpdateLeadLabelDto } from "./dto/lms-lead.dto";

@Controller("lms/leads")
export class LmsLeadsController {
  constructor(private readonly service: LmsLeadsService) {}

  @Get()
  findAll(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.service.findEnhanced(tenantId, {
      page: query["page"] ? parseInt(query["page"], 10) : undefined,
      limit: query["limit"] ? parseInt(query["limit"], 10) : undefined,
      search: query["search"],
      leadLabel: query["leadLabel"],
      projectId: query["projectId"],
      callStatus: query["callStatus"],
    });
  }

  @Get("tracking/:id")
  tracking(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.service.getTracking(tenantId, id);
  }

  @Post(":id/dismiss")
  dismiss(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: DismissLeadDto,
  ) {
    return this.service.dismiss(tenantId, id, user.userId, body);
  }

  @Patch(":id/label")
  updateLabel(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() body: UpdateLeadLabelDto,
  ) {
    return this.service.updateLabel(tenantId, id, body.leadLabel, body.leadCallStatus);
  }
}
