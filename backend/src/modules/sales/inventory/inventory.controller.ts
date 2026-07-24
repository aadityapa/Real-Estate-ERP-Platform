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
import { TenantId } from "../../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../../common/decorators/auth.decorators";
import { Permissions } from "../../../common/constants/permissions";
import { InventoryService } from "./inventory.service";
import { CreateUnitDto, FilterUnitDto, UpdateUnitDto } from "./dto/unit.dto";

@Controller("sales/inventory")
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @RequirePermissions(Permissions.SALES_INVENTORY_READ)
  findAll(@TenantId() tenantId: string, @Query() filter: FilterUnitDto) {
    return this.inventoryService.findAll(tenantId, filter);
  }

  @Get("availability")
  @RequirePermissions(Permissions.SALES_INVENTORY_READ)
  availability(
    @TenantId() tenantId: string,
    @Query("projectId") projectId?: string,
  ) {
    return this.inventoryService.getAvailability(tenantId, projectId);
  }

  @Get(":id")
  @RequirePermissions(Permissions.SALES_INVENTORY_READ)
  findOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.inventoryService.findOne(tenantId, id);
  }

  @Post()
  @RequirePermissions(Permissions.SALES_INVENTORY_WRITE)
  create(@TenantId() tenantId: string, @Body() dto: CreateUnitDto) {
    return this.inventoryService.create(tenantId, dto);
  }

  @Patch(":id")
  @RequirePermissions(Permissions.SALES_INVENTORY_WRITE)
  update(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: UpdateUnitDto,
  ) {
    return this.inventoryService.update(tenantId, id, dto);
  }

  @Delete(":id")
  @RequirePermissions(Permissions.SALES_INVENTORY_WRITE)
  remove(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.inventoryService.remove(tenantId, id);
  }
}
