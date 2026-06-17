import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { LmsDataFeedService } from "./lms-data-feed.service";
import { TenantId, CurrentUser } from "../../../common/decorators/current-user.decorator";
import type { JwtPayload } from "@propos/shared-types";

@Controller("lms/data-feed")
export class LmsDataFeedController {
  constructor(private readonly service: LmsDataFeedService) {}

  @Get()
  feed(
    @TenantId() tenantId: string,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("source") source?: string,
    @Query("projectId") projectId?: string,
    @Query("search") search?: string,
  ) {
    return this.service.getFeed(
      tenantId,
      status,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      source,
      projectId,
      search,
    );
  }

  @Get("stats")
  stats(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    return this.service.getStats(tenantId, user.userId);
  }

  @Get("my-claimed")
  myClaimed(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    return this.service.getMyClaimed(tenantId, user.userId);
  }

  @Post(":leadId/claim")
  claim(
    @TenantId() tenantId: string,
    @Param("leadId") leadId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.claimLead(tenantId, leadId, user.userId);
  }

  @Post(":leadId/release")
  release(
    @TenantId() tenantId: string,
    @Param("leadId") leadId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.releaseLead(tenantId, leadId, user.userId, user.roles);
  }
}
