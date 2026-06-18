import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { SiteVisitsService } from "./site-visits.service";
import {
  CreateSiteVisitDto,
  FilterSiteVisitDto,
  UpdateSiteVisitDto,
} from "./dto/site-visit.dto";
import { TenantId } from "../../../common/decorators/current-user.decorator";

@Controller("crm/site-visits")
export class SiteVisitsController {
  constructor(private readonly siteVisitsService: SiteVisitsService) {}

  @Get()
  findAll(@TenantId() tenantId: string, @Query() filter: FilterSiteVisitDto) {
    return this.siteVisitsService.findAll(tenantId, filter);
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateSiteVisitDto) {
    return this.siteVisitsService.create(tenantId, dto);
  }

  @Patch(":id")
  update(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: UpdateSiteVisitDto,
  ) {
    return this.siteVisitsService.update(tenantId, id, dto);
  }
}
