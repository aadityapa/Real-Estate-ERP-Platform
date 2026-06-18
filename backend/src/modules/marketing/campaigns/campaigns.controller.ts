import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { TenantId } from "../../../common/decorators/current-user.decorator";
import { CampaignsService } from "./campaigns.service";
import { CreateCampaignDto, FilterCampaignDto, UpdateCampaignDto } from "./dto/campaign.dto";

@Controller("marketing/campaigns")
export class CampaignsController {
  constructor(private readonly service: CampaignsService) {}

  @Get() findAll(@TenantId() tenantId: string, @Query() filter: FilterCampaignDto) { return this.service.findAll(tenantId, filter); }
  @Get(":id") findOne(@TenantId() tenantId: string, @Param("id") id: string) { return this.service.findOne(tenantId, id); }
  @Post() create(@TenantId() tenantId: string, @Body() dto: CreateCampaignDto) { return this.service.create(tenantId, dto); }
  @Patch(":id") update(@TenantId() tenantId: string, @Param("id") id: string, @Body() dto: UpdateCampaignDto) { return this.service.update(tenantId, id, dto); }
  @Delete(":id") remove(@TenantId() tenantId: string, @Param("id") id: string) { return this.service.remove(tenantId, id); }
}
