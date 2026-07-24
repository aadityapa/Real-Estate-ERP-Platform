import { Module } from "@nestjs/common";
import { LmsDashboardController } from "./dashboard/lms-dashboard.controller";
import { LmsDashboardService } from "./dashboard/lms-dashboard.service";
import { LmsGoalsController } from "./goals/lms-goals.controller";
import { LmsGoalsService } from "./goals/lms-goals.service";
import { LmsDataFeedController } from "./data-feed/lms-data-feed.controller";
import { LmsDataFeedService } from "./data-feed/lms-data-feed.service";
import { LmsAppointmentsController } from "./appointments/lms-appointments.controller";
import { LmsAppointmentsService } from "./appointments/lms-appointments.service";
import { LmsReportsController } from "./reports/lms-reports.controller";
import { LmsReportsService } from "./reports/lms-reports.service";
import { LmsLeadsController } from "./leads/lms-leads.controller";
import { LmsLeadsService } from "./leads/lms-leads.service";
import { LmsYpsrController } from "./site-visits/lms-ypsr.controller";
import { LmsYpsrService } from "./site-visits/lms-ypsr.service";
import { EventsModule } from "../events/events.module";
import { PlatformModule } from "../platform/platform.module";

@Module({
  imports: [EventsModule, PlatformModule],
  controllers: [
    LmsDashboardController,
    LmsGoalsController,
    LmsDataFeedController,
    LmsAppointmentsController,
    LmsReportsController,
    LmsLeadsController,
    LmsYpsrController,
  ],
  providers: [
    LmsDashboardService,
    LmsGoalsService,
    LmsDataFeedService,
    LmsAppointmentsService,
    LmsReportsService,
    LmsLeadsService,
    LmsYpsrService,
  ],
  exports: [LmsDataFeedService],
})
export class LmsModule {}
