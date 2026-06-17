import { Controller, Get, Query } from "@nestjs/common";
import { LmsReportsService } from "./lms-reports.service";
import { TenantId } from "../../../common/decorators/current-user.decorator";

@Controller("lms/reports")
export class LmsReportsController {
  constructor(private readonly service: LmsReportsService) {}

  @Get("call-log")
  callLog(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.service.callLogReport(tenantId, query);
  }

  @Get("site-visits")
  siteVisits(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.service.siteVisitReport(tenantId, query);
  }

  @Get("digital-hoarding")
  digitalHoarding(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.service.digitalHoardingReport(tenantId, query);
  }

  @Get("digital-enquiry")
  digitalEnquiry(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.service.digitalEnquiryReport(tenantId, query);
  }

  @Get("lead-tracking")
  leadTracking(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.service.leadTrackingReport(tenantId, query);
  }

  @Get("da-report")
  daReport(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.service.daReport(tenantId, query);
  }
}
