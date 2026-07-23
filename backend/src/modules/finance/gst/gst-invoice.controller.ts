import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { TenantId } from "../../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../../common/decorators/auth.decorators";
import { Permissions } from "../../../common/constants/permissions";
import { GstInvoiceService } from "./gst-invoice.service";
import {
  CancelEInvoiceDto,
  CreateGstInvoiceDto,
  FilterGstInvoiceDto,
  GstrExportQueryDto,
} from "./dto/gst-invoice.dto";

@Controller("finance/gst")
export class GstInvoiceController {
  constructor(private readonly service: GstInvoiceService) {}

  @Get("export/gstr1")
  @RequirePermissions(Permissions.FINANCE_GST_READ)
  exportGstr1(
    @TenantId() tenantId: string,
    @Query() query: GstrExportQueryDto,
  ) {
    return this.service.exportSalesRegister(tenantId, query);
  }

  @Get()
  @RequirePermissions(Permissions.FINANCE_GST_READ)
  findAll(@TenantId() tenantId: string, @Query() filter: FilterGstInvoiceDto) {
    return this.service.findAll(tenantId, filter);
  }

  @Get(":id")
  @RequirePermissions(Permissions.FINANCE_GST_READ)
  findOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.service.findOne(tenantId, id);
  }

  @Post()
  @RequirePermissions(Permissions.FINANCE_GST_WRITE)
  create(@TenantId() tenantId: string, @Body() dto: CreateGstInvoiceDto) {
    return this.service.create(tenantId, dto);
  }

  @Post(":id/e-invoice")
  @RequirePermissions(Permissions.FINANCE_GST_WRITE)
  generateEInvoice(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.service.generateEInvoice(tenantId, id);
  }

  @Post(":id/e-invoice/cancel")
  @RequirePermissions(Permissions.FINANCE_GST_WRITE)
  cancelEInvoice(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: CancelEInvoiceDto,
  ) {
    return this.service.cancelEInvoice(tenantId, id, dto);
  }
}
