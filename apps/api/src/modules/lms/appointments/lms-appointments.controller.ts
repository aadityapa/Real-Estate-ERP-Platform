import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { LmsAppointmentsService } from "./lms-appointments.service";
import { TenantId, CurrentUser } from "../../../common/decorators/current-user.decorator";
import type { JwtPayload } from "@propos/shared-types";

@Controller("lms/appointments")
export class LmsAppointmentsController {
  constructor(private readonly service: LmsAppointmentsService) {}

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query("tab") tab = "today",
    @Query("mine") mine?: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.service.findByTab(
      tenantId,
      tab,
      mine === "true" ? user?.userId : undefined,
    );
  }

  @Post()
  create(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      leadId: string;
      type: "CALL" | "SITE_VISIT" | "MEETING" | "FOLLOW_UP";
      scheduledAt: string;
      duration?: number;
      notes?: string;
      projectName?: string;
    },
  ) {
    return this.service.create(tenantId, user.userId, body);
  }

  @Patch(":id/status")
  updateStatus(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body() body: { status: "COMPLETED" | "MISSED" | "RESCHEDULED" | "CANCELLED"; scheduledAt?: string },
  ) {
    return this.service.updateStatus(tenantId, id, body.status, body.scheduledAt);
  }
}
