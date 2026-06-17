import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { TenantId } from "../../common/decorators/current-user.decorator";
import { VendorsService } from "./vendors.service";
import { CreateVendorDto, FilterVendorDto, UpdateVendorDto } from "./dto/vendor.dto";

@Controller("vendors")
export class VendorsController {
  constructor(private readonly service: VendorsService) {}

  @Get() findAll(@TenantId() tenantId: string, @Query() filter: FilterVendorDto) { return this.service.findAll(tenantId, filter); }
  @Get(":id") findOne(@TenantId() tenantId: string, @Param("id") id: string) { return this.service.findOne(tenantId, id); }
  @Post() create(@TenantId() tenantId: string, @Body() dto: CreateVendorDto) { return this.service.create(tenantId, dto); }
  @Patch(":id") update(@TenantId() tenantId: string, @Param("id") id: string, @Body() dto: UpdateVendorDto) { return this.service.update(tenantId, id, dto); }
  @Delete(":id") archive(@TenantId() tenantId: string, @Param("id") id: string) { return this.service.archive(tenantId, id); }
}
