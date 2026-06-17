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
import { InventoryService } from "./inventory.service";
import { CreateUnitDto, FilterUnitDto, UpdateUnitDto } from "./dto/unit.dto";

@Controller("sales/inventory")
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  findAll(@TenantId() tenantId: string, @Query() filter: FilterUnitDto) {
    return this.inventoryService.findAll(tenantId, filter);
  }

  @Get(":id")
  findOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.inventoryService.findOne(tenantId, id);
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateUnitDto) {
    return this.inventoryService.create(tenantId, dto);
  }

  @Patch(":id")
  update(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: UpdateUnitDto,
  ) {
    return this.inventoryService.update(tenantId, id, dto);
  }

  @Delete(":id")
  remove(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.inventoryService.remove(tenantId, id);
  }
}
