import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { LmsYpsrService } from "./lms-ypsr.service";
import { TenantId } from "../../../common/decorators/current-user.decorator";

@Controller("lms/site-visits")
export class LmsYpsrController {
  constructor(private readonly service: LmsYpsrService) {}

  @Get()
  findAll(@TenantId() tenantId: string, @Query("status") status?: string) {
    return this.service.findSiteVisits(tenantId, status);
  }

  @Get(":id/ypsr")
  getYpsr(@TenantId() tenantId: string, @Param("id") id: string) {
    return this.service.getYpsr(tenantId, id);
  }

  @Post(":id/ypsr")
  createYpsr(
    @TenantId() tenantId: string,
    @Param("id") id: string,
    @Body()
    body: {
      unitsShown: string[];
      amenitiesPresented: string[];
      leadFeedback?: string;
      interestLevel: string;
      objections: string[];
      priceOffered?: number;
      followUpDate?: string;
      followUpAction?: string;
      outcome: string;
      photos?: string[];
    },
  ) {
    return this.service.createYpsr(tenantId, id, body);
  }
}
