import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getPaginationParams } from "@propos/shared-utils";
import { PrismaService } from "../../../database/prisma.service";
import { paginate } from "../../../common/utils/paginate";
import { FilterNotificationDto } from "./dto/notification.dto";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, userId: string, filter: FilterNotificationDto) {
    const { skip, take, page, limit } = getPaginationParams(filter.page, filter.limit);
    const where: Prisma.NotificationWhereInput = {
      user: { tenantId, id: userId },
      ...(filter.isRead !== undefined && { isRead: filter.isRead }),
    };
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({ where, skip, take, orderBy: { createdAt: "desc" } }),
      this.prisma.notification.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async findOne(tenantId: string, userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId, user: { tenantId } },
    });
    if (!notification) throw new NotFoundException("Notification not found");
    return notification;
  }

  async markRead(tenantId: string, userId: string, id: string) {
    await this.findOne(tenantId, userId, id);
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  async markAllRead(tenantId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, user: { tenantId }, isRead: false },
      data: { isRead: true },
    });
  }
}
