import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import { join } from "path";
import { existsSync } from "fs";
import { TenantId } from "../../../common/decorators/current-user.decorator";
import { BookingsService } from "./bookings.service";
import {
  CreateBookingDto,
  FilterBookingDto,
  UpdateBookingDto,
} from "./dto/booking.dto";
import {
  ConfirmBookingDto,
  GenerateAgreementDto,
  ReserveUnitDto,
} from "./dto/booking-flow.dto";

@Controller("sales/bookings")
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  findAll(@TenantId() tenantId: string, @Query() filter: FilterBookingDto) {
    return this.bookingsService.findAll(tenantId, filter);
  }

  @Post("reserve")
  reserve(@TenantId() tenantId: string, @Body() dto: ReserveUnitDto) {
    return this.bookingsService.reserve(tenantId, dto);
  }

  @Post("confirm")
  confirm(@TenantId() tenantId: string, @Body() dto: ConfirmBookingDto) {
    return this.bookingsService.confirm(tenantId, dto);
  }

  @Get(":id")
  findOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.bookingsService.findOne(tenantId, id);
  }

  @Post()
  create(@TenantId() tenantId: string, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(tenantId, dto);
  }

  @Post(":id/agreement")
  generateAgreement(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: GenerateAgreementDto,
  ) {
    return this.bookingsService.generateAgreement(tenantId, id, dto);
  }

  @Get(":id/agreement/pdf")
  downloadAgreement(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Res() res: Response,
  ): void {
    void this.bookingsService.findOne(tenantId, id).then((booking) => {
      if (!booking.agreement?.documentUrl) {
        res.status(404).json({ success: false, error: { message: "No agreement PDF" } });
        return;
      }
      const filepath = join(
        process.cwd(),
        booking.agreement.documentUrl.replace(/^\//, ""),
      );
      if (!existsSync(filepath)) {
        res.status(404).json({ success: false, error: { message: "PDF not found" } });
        return;
      }
      res.download(filepath);
    });
  }

  @Patch(":id")
  update(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: UpdateBookingDto,
  ) {
    return this.bookingsService.update(tenantId, id, dto);
  }

  @Delete(":id")
  cancel(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.bookingsService.cancel(tenantId, id);
  }
}
