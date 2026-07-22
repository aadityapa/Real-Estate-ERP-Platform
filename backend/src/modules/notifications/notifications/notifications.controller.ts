import { Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser, TenantId } from "../../../common/decorators/current-user.decorator";
import type { JwtPayload } from "@propos/shared-types";
import { NotificationsService } from "./notifications.service";
import { FilterNotificationDto } from "./dto/notification.dto";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  findAll(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload, @Query() filter: FilterNotificationDto) {
    return this.service.findAll(tenantId, user.userId, filter);
  }

  @Get(":id")
  findOne(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.service.findOne(tenantId, user.userId, id);
  }

  @Patch(":id/read")
  markRead(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.service.markRead(tenantId, user.userId, id);
  }

  @Post("read-all")
  markAllRead(@TenantId() tenantId: string, @CurrentUser() user: JwtPayload) {
    return this.service.markAllRead(tenantId, user.userId);
  }
}
