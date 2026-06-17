import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma.service";

@Injectable()
export class LmsGoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, projectId?: string, month?: number, year?: number) {
    const now = new Date();
    return this.prisma.lmsGoal.findMany({
      where: {
        tenantId,
        ...(projectId && { projectId }),
        month: month ?? now.getMonth() + 1,
        year: year ?? now.getFullYear(),
      },
      include: {
        project: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(
    tenantId: string,
    userId: string,
    dto: {
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
    return this.prisma.lmsGoal.create({
      data: {
        tenantId,
        createdById: userId,
        ...dto,
        targetRevenue: dto.targetRevenue,
      },
      include: {
        project: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async getWithActuals(tenantId: string, id: string) {
    const goal = await this.prisma.lmsGoal.findFirst({
      where: { id, tenantId },
      include: {
        project: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!goal) throw new NotFoundException("Goal not found");

    const start = new Date(goal.year, goal.month - 1, 1);
    const end = new Date(goal.year, goal.month, 0, 23, 59, 59);

    const leadWhere = {
      tenantId,
      projectId: goal.projectId,
      isArchived: false,
      createdAt: { gte: start, lte: end },
      ...(goal.userId && { assignedToId: goal.userId }),
    };

    const [actualEnquiries, actualSiteVisits, actualBookings, revenueAgg] =
      await Promise.all([
        this.prisma.lead.count({ where: leadWhere }),
        this.prisma.siteVisit.count({
          where: {
            projectId: goal.projectId,
            status: "COMPLETED",
            completedAt: { gte: start, lte: end },
            ...(goal.userId && { attendedBy: goal.userId }),
          },
        }),
        this.prisma.booking.count({
          where: {
            lead: { tenantId, projectId: goal.projectId },
            ...(goal.userId && { salesPersonId: goal.userId }),
            createdAt: { gte: start, lte: end },
          },
        }),
        this.prisma.booking.aggregate({
          where: {
            lead: { tenantId, projectId: goal.projectId },
            ...(goal.userId && { salesPersonId: goal.userId }),
            createdAt: { gte: start, lte: end },
          },
          _sum: { totalAmount: true },
        }),
      ]);

    const actualRevenue = Number(revenueAgg._sum.totalAmount ?? 0);

    return {
      ...goal,
      actuals: {
        actualEnquiries,
        actualSiteVisits,
        actualBookings,
        actualRevenue,
      },
      progress: {
        enquiries: goal.targetEnquiries
          ? Math.round((actualEnquiries / goal.targetEnquiries) * 1000) / 10
          : 0,
        siteVisits: goal.targetSiteVisits
          ? Math.round((actualSiteVisits / goal.targetSiteVisits) * 1000) / 10
          : 0,
        bookings: goal.targetBookings
          ? Math.round((actualBookings / goal.targetBookings) * 1000) / 10
          : 0,
        revenue: Number(goal.targetRevenue)
          ? Math.round((actualRevenue / Number(goal.targetRevenue)) * 1000) / 10
          : 0,
      },
    };
  }
}
