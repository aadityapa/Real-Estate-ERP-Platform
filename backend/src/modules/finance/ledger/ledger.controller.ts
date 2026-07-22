import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { TenantId } from "../../../common/decorators/current-user.decorator";
import { LedgerService } from "./ledger.service";
import { CreateLedgerEntryDto, FilterLedgerDto, UpdateLedgerEntryDto } from "./dto/ledger.dto";

@Controller("finance/ledger")
export class LedgerController {
  constructor(private readonly service: LedgerService) {}

  @Get() findAll(@TenantId() tenantId: string, @Query() filter: FilterLedgerDto) { return this.service.findAll(tenantId, filter); }
  @Get(":id") findOne(@TenantId() tenantId: string, @Param("id") id: string) { return this.service.findOne(tenantId, id); }
  @Post() create(@TenantId() tenantId: string, @Body() dto: CreateLedgerEntryDto) { return this.service.create(tenantId, dto); }
  @Patch(":id") update(@TenantId() tenantId: string, @Param("id") id: string, @Body() dto: UpdateLedgerEntryDto) { return this.service.update(tenantId, id, dto); }
  @Delete(":id") remove(@TenantId() tenantId: string, @Param("id") id: string) { return this.service.remove(tenantId, id); }
}
