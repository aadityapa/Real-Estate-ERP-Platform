import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { LmsDashboardService } from "./lms-dashboard.service";
import { TenantId, CurrentUser } from "../../../common/decorators/current-user.decorator";
import type { JwtPayload } from "@propos/shared-types";

@Controller("lms/dashboard")
export class LmsDashboardController {
  constructor(private readonly service: LmsDashboardService) {}

  @Get("counters")
  counters(
    @TenantId() tenantId: string,
    @Query("projectId") projectId?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
  ) {
    return this.service.getCounters(tenantId, projectId, dateFrom, dateTo);
  }

  @Get("leaderboard")
  leaderboard(
    @TenantId() tenantId: string,
    @Query("month") month?: string,
    @Query("year") year?: string,
    @Query("projectId") projectId?: string,
  ) {
    return this.service.getLeaderboard(
      tenantId,
      month ? parseInt(month, 10) : undefined,
      year ? parseInt(year, 10) : undefined,
      projectId,
    );
  }

  @Get("funnel")
  funnel(@TenantId() tenantId: string, @Query("projectId") projectId?: string) {
    return this.service.getFunnel(tenantId, projectId);
  }

  @Get("sources")
  sources(@TenantId() tenantId: string, @Query("projectId") projectId?: string) {
    return this.service.getSourceBreakdown(tenantId, projectId);
  }

  @Get("clash-leads")
  clashLeads(@TenantId() tenantId: string, @Query("status") status?: string) {
    return this.service.getClashLeads(tenantId, status);
  }

  @Post("clash-leads/:id/resolve")
  resolveClash(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: { assignedToId: string },
  ) {
    return this.service.resolveClash(tenantId, id, body.assignedToId, user.userId);
  }

  @Post("clash-leads/:id/dismiss")
  dismissClash(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.dismissClash(tenantId, id, user.userId);
  }
}
