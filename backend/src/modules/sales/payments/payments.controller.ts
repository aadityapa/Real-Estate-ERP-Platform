import { Body, Controller, Get, Param, Post, Res } from "@nestjs/common";
import { Response } from "express";
import { join } from "path";
import { existsSync } from "fs";
import { TenantId } from "../../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../../common/decorators/auth.decorators";
import { Permissions } from "../../../common/constants/permissions";
import { PaymentsService } from "./payments.service";
import { RecordPaymentDto } from "./dto/payment.dto";

@Controller("sales/payments")
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Get("booking/:bookingId")
  @RequirePermissions(Permissions.SALES_PAYMENTS_READ)
  findByBooking(
    @TenantId() tenantId: string,
    @Param("bookingId") bookingId: string,
  ) {
    return this.service.findByBooking(tenantId, bookingId);
  }

  @Post(":id/record")
  @RequirePermissions(Permissions.SALES_PAYMENTS_WRITE)
  recordPayment(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: RecordPaymentDto,
  ) {
    return this.service.recordPayment(tenantId, id, dto);
  }

  @Get("receipt/:receiptId/pdf")
  @RequirePermissions(Permissions.SALES_PAYMENTS_READ)
  async downloadReceipt(
    @TenantId() tenantId: string,
    @Param("receiptId") receiptId: string,
    @Res() res: Response,
  ): Promise<void> {
    const pdfUrl = await this.service.getReceiptPdfPath(tenantId, receiptId);
    if (!pdfUrl) {
      res.status(404).json({ success: false, error: { message: "No receipt PDF" } });
      return;
    }
    const filepath = join(process.cwd(), pdfUrl.replace(/^\//, ""));
    if (!existsSync(filepath)) {
      res.status(404).json({ success: false, error: { message: "PDF not found" } });
      return;
    }
    res.download(filepath);
  }
}
