import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { TenantId } from "../../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../../common/decorators/auth.decorators";
import { Permissions } from "../../../common/constants/permissions";
import { TdsService } from "./tds.service";
import {
  CreateTdsEntryDto,
  FilterTdsEntryDto,
  TdsReturnQueryDto,
  UpdateTdsEntryDto,
} from "./dto/tds.dto";

@Controller("finance/tds")
export class TdsController {
  constructor(private readonly service: TdsService) {}

  @Get("export/return")
  @RequirePermissions(Permissions.FINANCE_TDS_READ)
  exportReturn(
    @TenantId() tenantId: string,
    @Query() query: TdsReturnQueryDto,
  ) {
    return this.service.exportReturn(tenantId, query);
  }

  @Get()
  @RequirePermissions(Permissions.FINANCE_TDS_READ)
  findAll(@TenantId() tenantId: string, @Query() filter: FilterTdsEntryDto) {
    return this.service.findAll(tenantId, filter);
  }

  @Get(":id")
  @RequirePermissions(Permissions.FINANCE_TDS_READ)
  findOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Post()
  @RequirePermissions(Permissions.FINANCE_TDS_WRITE)
  create(@TenantId() tenantId: string, @Body() dto: CreateTdsEntryDto) {
    return this.service.create(tenantId, dto);
  }

  @Patch(":id")
  @RequirePermissions(Permissions.FINANCE_TDS_WRITE)
  update(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: UpdateTdsEntryDto,
  ) {
    return this.service.update(tenantId, id, dto);
  }
}
