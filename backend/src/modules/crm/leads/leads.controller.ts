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
import type { JwtPayload } from "@propos/shared-types";

@Controller("crm/leads")
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  findAll(@TenantId() tenantId: string, @Query() filter: FilterLeadDto) {
    return this.leadsService.findAll(tenantId, filter);
  }

  @Get("pipeline")
  pipeline(@TenantId() tenantId: string) {
    return this.leadsService.findByStatus(tenantId);
  }

  @Get("dashboard")
  dashboard(@TenantId() tenantId: string) {
    return this.leadsService.getDashboardStats(tenantId);
  }

  @Get(":id")
  findOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.leadsService.findOne(tenantId, id);
  }

  @Post()
  create(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateLeadDto,
  ) {
    return this.leadsService.create(tenantId, user.userId, dto);
  }

  @Patch(":id")
  update(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateLeadDto,
  ) {
    return this.leadsService.update(tenantId, user.userId, id, dto);
  }

  @Post(":id/assign")
  assign(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: AssignLeadDto,
  ) {
    return this.leadsService.assign(tenantId, user.userId, id, dto);
  }

  @Delete(":id")
  archive(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.leadsService.archive(tenantId, id);
  }
}
