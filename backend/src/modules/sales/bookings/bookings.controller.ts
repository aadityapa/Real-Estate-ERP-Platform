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
import { RequirePermissions } from "../../../common/decorators/auth.decorators";
import { Permissions } from "../../../common/constants/permissions";
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
  @RequirePermissions(Permissions.SALES_BOOKINGS_READ)
  findAll(@TenantId() tenantId: string, @Query() filter: FilterBookingDto) {
    return this.bookingsService.findAll(tenantId, filter);
  }

  @Post("reserve")
  @RequirePermissions(Permissions.SALES_BOOKINGS_WRITE)
  reserve(@TenantId() tenantId: string, @Body() dto: ReserveUnitDto) {
    return this.bookingsService.reserve(tenantId, dto);
  }

  @Post("confirm")
  @RequirePermissions(Permissions.SALES_BOOKINGS_WRITE)
  confirm(@TenantId() tenantId: string, @Body() dto: ConfirmBookingDto) {
    return this.bookingsService.confirm(tenantId, dto);
  }

  @Get(":id")
  @RequirePermissions(Permissions.SALES_BOOKINGS_READ)
  findOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.bookingsService.findOne(tenantId, id);
  }

  @Post()
  @RequirePermissions(Permissions.SALES_BOOKINGS_WRITE)
  create(@TenantId() tenantId: string, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(tenantId, dto);
  }

  @Post(":id/agreement")
  @RequirePermissions(Permissions.SALES_BOOKINGS_WRITE)
  generateAgreement(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: GenerateAgreementDto,
  ) {
    return this.bookingsService.generateAgreement(tenantId, id, dto);
  }

  @Get(":id/agreement/pdf")
  @RequirePermissions(Permissions.SALES_BOOKINGS_READ)
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
  @RequirePermissions(Permissions.SALES_BOOKINGS_WRITE)
  update(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() dto: UpdateBookingDto,
  ) {
    return this.bookingsService.update(tenantId, id, dto);
  }

  @Delete(":id")
  @RequirePermissions(Permissions.SALES_BOOKINGS_WRITE)
  cancel(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.bookingsService.cancel(tenantId, id);
  }
}
