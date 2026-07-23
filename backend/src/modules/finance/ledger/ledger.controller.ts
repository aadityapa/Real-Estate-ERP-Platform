import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { TenantId } from "../../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../../common/decorators/auth.decorators";
import { Permissions } from "../../../common/constants/permissions";
import { LedgerService } from "./ledger.service";
import { CreateLedgerEntryDto, FilterLedgerDto, UpdateLedgerEntryDto } from "./dto/ledger.dto";

@Controller("finance/ledger")
export class LedgerController {
  constructor(private readonly service: LedgerService) {}

  @Get()
  @RequirePermissions(Permissions.FINANCE_LEDGER_READ)
  findAll(@TenantId() tenantId: string, @Query() filter: FilterLedgerDto) {
    return this.service.findAll(tenantId, filter);
  }

  @Get(":id")
  @RequirePermissions(Permissions.FINANCE_LEDGER_READ)
  findOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Post()
  @RequirePermissions(Permissions.FINANCE_LEDGER_WRITE)
  create(@TenantId() tenantId: string, @Body() dto: CreateLedgerEntryDto) {
    return this.service.create(tenantId, dto);
  }

  @Patch(":id")
  @RequirePermissions(Permissions.FINANCE_LEDGER_WRITE)
  update(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: UpdateLedgerEntryDto,
  ) {
    return this.service.update(tenantId, id, dto);
  }

  @Delete(":id")
  @RequirePermissions(Permissions.FINANCE_LEDGER_WRITE)
  remove(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.service.remove(tenantId, id);
  }
}
