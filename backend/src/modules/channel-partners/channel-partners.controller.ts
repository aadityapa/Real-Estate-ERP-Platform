import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { TenantId } from "../../common/decorators/current-user.decorator";
import { ChannelPartnersService } from "./channel-partners.service";
import { CreateChannelPartnerDto, FilterChannelPartnerDto, UpdateChannelPartnerDto } from "./dto/channel-partner.dto";

@Controller("channel-partners")
export class ChannelPartnersController {
  constructor(private readonly service: ChannelPartnersService) {}

  @Get() findAll(@TenantId() tenantId: string, @Query() filter: FilterChannelPartnerDto) { return this.service.findAll(tenantId, filter); }
  @Get(":id") findOne(@TenantId() tenantId: string, @Param("id") id: string) { return this.service.findOne(tenantId, id); }
  @Post() create(@TenantId() tenantId: string, @Body() dto: CreateChannelPartnerDto) { return this.service.create(tenantId, dto); }
  @Patch(":id") update(@TenantId() tenantId: string, @Param("id") id: string, @Body() dto: UpdateChannelPartnerDto) { return this.service.update(tenantId, id, dto); }
  @Delete(":id") archive(@TenantId() tenantId: string, @Param("id") id: string) { return this.service.archive(tenantId, id); }
}
