import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";

@Injectable()
export class LmsAppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByTab(tenantId: string, tab: string, userId?: string) {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const base: Prisma.AppointmentWhereInput = {
      tenantId,
      ...(userId && { userId }),
    };

    if (tab === "pending") {
      return this.findWithLead({
        ...base,
        status: { in: ["PENDING", "MISSED"] },
        scheduledAt: { lt: now },
      });
    }

    if (tab === "today") {
      return this.findWithLead({
        ...base,
        scheduledAt: { gte: todayStart, lte: todayEnd },
        status: { not: "CANCELLED" },
      });
    }

    return this.findWithLead({
      ...base,
      scheduledAt: { gt: todayEnd, lte: weekEnd },
      status: { in: ["PENDING", "RESCHEDULED"] },
    });
  }

  async create(
    tenantId: string,
    userId: string,
    dto: {
      leadId: string;
      type: "CALL" | "SITE_VISIT" | "MEETING" | "FOLLOW_UP";
      scheduledAt: string;
      duration?: number;
      notes?: string;
      projectName?: string;
    },
  ) {
    return this.prisma.appointment.create({
      data: {
        tenantId,
        userId,
        leadId: dto.leadId,
        type: dto.type,
        scheduledAt: new Date(dto.scheduledAt),
        duration: dto.duration,
        notes: dto.notes,
        projectName: dto.projectName,
      },
      include: this.leadInclude(),
    });
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: "COMPLETED" | "MISSED" | "RESCHEDULED" | "CANCELLED",
    scheduledAt?: string,
  ) {
    const appt = await this.prisma.appointment.findFirst({
      where: { id, tenantId },
    });
    if (!appt) throw new NotFoundException("Appointment not found");

    return this.prisma.appointment.update({
      where: { id },
      data: {
        status,
        ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }),
      },
      include: this.leadInclude(),
    });
  }

  private leadInclude() {
    return {
      lead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          project: { select: { name: true } },
        },
      },
      user: { select: { id: true, firstName: true, lastName: true } },
    };
  }

  private findWithLead(where: Prisma.AppointmentWhereInput) {
    return this.prisma.appointment.findMany({
      where,
      include: this.leadInclude(),
      orderBy: { scheduledAt: "asc" },
    });
  }
}
