import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { LeadsService } from "./leads.service";
import {
  AssignLeadDto,
  CreateLeadDto,
  FilterLeadDto,
  UpdateLeadDto,
} from "./dto/lead.dto";
import { CurrentUser, TenantId } from "../../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../../common/decorators/auth.decorators";
import { Permissions } from "../../../common/constants/permissions";
import type { JwtPayload } from "@propos/shared-types";

@Controller("crm/leads")
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @RequirePermissions(Permissions.CRM_LEADS_READ)
  findAll(@TenantId() tenantId: string, @Query() filter: FilterLeadDto) {
    return this.leadsService.findAll(tenantId, filter);
  }

  @Get("pipeline")
  @RequirePermissions(Permissions.CRM_LEADS_READ)
  pipeline(@TenantId() tenantId: string) {
    return this.leadsService.findByStatus(tenantId);
  }

  @Get("dashboard")
  @RequirePermissions(Permissions.CRM_LEADS_READ)
  dashboard(@TenantId() tenantId: string) {
    return this.leadsService.getDashboardStats(tenantId);
  }

  @Get(":id")
  @RequirePermissions(Permissions.CRM_LEADS_READ)
  findOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.leadsService.findOne(tenantId, id);
  }

  @Post()
  @RequirePermissions(Permissions.CRM_LEADS_WRITE)
  create(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateLeadDto,
  ) {
    return this.leadsService.create(tenantId, user.userId, dto);
  }

  @Patch(":id")
  @RequirePermissions(Permissions.CRM_LEADS_WRITE)
  update(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leadsService.update(tenantId, user, id, dto);
  }

  @Post(":id/assign")
  @RequirePermissions(Permissions.CRM_LEADS_MANAGE)
  assign(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: AssignLeadDto,
  ) {
    return this.leadsService.assign(tenantId, user.userId, id, dto);
  }

  @Delete(":id")
  @RequirePermissions(Permissions.CRM_LEADS_MANAGE)
  archive(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.leadsService.archive(tenantId, id);
  }
}
