import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { TenantId } from "../../../common/decorators/current-user.decorator";
import { AssetsService } from "./assets.service";
import { CreateAssetDto, FilterAssetDto, UpdateAssetDto } from "./dto/asset.dto";

@Controller("assets")
export class AssetsController {
  constructor(private readonly service: AssetsService) {}

  @Get() findAll(@TenantId() tenantId: string, @Query() filter: FilterAssetDto) { return this.service.findAll(tenantId, filter); }
  @Get(":id") findOne(@TenantId() tenantId: string, @Param("id") id: string) { return this.service.findOne(tenantId, id); }
  @Post() create(@TenantId() tenantId: string, @Body() dto: CreateAssetDto) { return this.service.create(tenantId, dto); }
  @Patch(":id") update(@TenantId() tenantId: string, @Param("id") id: string, @Body() dto: UpdateAssetDto) { return this.service.update(tenantId, id, dto); }
  @Delete(":id") archive(@TenantId() tenantId: string, @Param("id") id: string) { return this.service.archive(tenantId, id); }
}
