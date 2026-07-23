import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { TenantId } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/auth.decorators";
import { Permissions } from "../../common/constants/permissions";
import { VendorsService } from "./vendors.service";
import { CreateVendorDto, FilterVendorDto, UpdateVendorDto } from "./dto/vendor.dto";

@Controller("vendors")
export class VendorsController {
  constructor(private readonly service: VendorsService) {}

  @Get()
  @RequirePermissions(Permissions.VENDORS_READ)
  findAll(@TenantId() tenantId: string, @Query() filter: FilterVendorDto) {
    return this.service.findAll(tenantId, filter);
  }

  @Get(":id")
  @RequirePermissions(Permissions.VENDORS_READ)
  findOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Post()
  @RequirePermissions(Permissions.VENDORS_WRITE)
  create(@TenantId() tenantId: string, @Body() dto: CreateVendorDto) {
    return this.service.create(tenantId, dto);
  }

  @Patch(":id")
  @RequirePermissions(Permissions.VENDORS_WRITE)
  update(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: UpdateVendorDto,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(":id")
  @RequirePermissions(Permissions.VENDORS_WRITE)
  archive(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.service.archive(tenantId, id);
  }
}
