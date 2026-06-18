import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { LmsGoalsService } from "./lms-goals.service";
import { TenantId, CurrentUser } from "../../../common/decorators/current-user.decorator";
import type { JwtPayload } from "@propos/shared-types";

@Controller("lms/goals")
export class LmsGoalsController {
  constructor(private readonly service: LmsGoalsService) {}

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query("projectId") projectId?: string,
    @Query("month") month?: string,
    @Query("year") year?: string,
  ) {
    return this.service.findAll(
      tenantId,
      projectId,
      month ? parseInt(month, 10) : undefined,
      year ? parseInt(year, 10) : undefined,
    );
  }

  @Get(":id")
  findOne(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.service.getWithActuals(tenantId, id);
  }

  @Post()
  create(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      projectId: string;
      userId?: string;
      teamId?: string;
      month: number;
      year: number;
      targetEnquiries: number;
      targetSiteVisits: number;
      targetBookings: number;
      targetRevenue: number;
    },
  ) {
    return this.service.create(tenantId, user.userId, body);
  }
}
