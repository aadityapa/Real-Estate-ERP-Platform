import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";

@Injectable()
export class LmsDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getCounters(tenantId: string, projectId?: string, dateFrom?: string, dateTo?: string) {
    const dateFilter = this.dateRange(dateFrom, dateTo);
    const projectFilter = projectId ? { projectId } : {};

    const [totalEnquiries, siteVisits, bookingsDone, inventoryAvailable, totalProjects] =
      await Promise.all([
        this.prisma.lead.count({
          where: { tenantId, isArchived: false, ...projectFilter, ...dateFilter },
        }),
        this.prisma.siteVisit.count({
          where: {
            lead: { tenantId, ...projectFilter },
            status: "COMPLETED",
            ...(dateFilter.createdAt && { completedAt: dateFilter.createdAt }),
          },
        }),
        this.prisma.booking.count({
          where: {
            lead: { tenantId, ...projectFilter },
            status: { in: ["BOOKED", "AGREEMENT", "REGISTERED", "POSSESSION"] },
            ...(dateFilter.createdAt && { createdAt: dateFilter.createdAt }),
          },
        }),
        this.prisma.unit.count({
          where: {
            status: "AVAILABLE",
            project: {
              company: { tenantId },
              ...(projectId && { id: projectId }),
            },
          },
        }),
        this.prisma.project.count({
          where: {
            company: { tenantId },
            ...(projectId && { id: projectId }),
          },
        }),
      ]);

    const conversionRatio =
      totalEnquiries > 0
        ? Math.round((bookingsDone / totalEnquiries) * 1000) / 10
        : 0;

    return {
      totalEnquiries,
      siteVisits,
      bookingsDone,
      conversionRatio,
      inventoryAvailable,
      totalProjects,
    };
  }

  async getLeaderboard(
    tenantId: string,
    month?: number,
    year?: number,
    projectId?: string,
  ) {
    const now = new Date();
    const m = month ?? now.getMonth() + 1;
    const y = year ?? now.getFullYear();
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);

    const users = await this.prisma.user.findMany({
      where: { tenantId, status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true, avatar: true },
    });

    const entries = await Promise.all(
      users.map(async (user) => {
        const leadWhere: Prisma.LeadWhereInput = {
          tenantId,
          assignedToId: user.id,
          isArchived: false,
          createdAt: { gte: start, lte: end },
          ...(projectId && { projectId }),
        };

        const [totalLeads, siteVisits, bookings] = await Promise.all([
          this.prisma.lead.count({ where: leadWhere }),
          this.prisma.siteVisit.count({
            where: {
              attendedBy: user.id,
              status: "COMPLETED",
              completedAt: { gte: start, lte: end },
              lead: { tenantId },
            },
          }),
          this.prisma.booking.count({
            where: {
              lead: { tenantId, ...(projectId && { projectId }) },
              salesPersonId: user.id,
              createdAt: { gte: start, lte: end },
            },
          }),
        ]);

        const conversionRate =
          totalLeads > 0 ? Math.round((bookings / totalLeads) * 1000) / 10 : 0;

        return {
          userId: user.id,
          name: `${user.firstName} ${user.lastName}`,
          avatar: user.avatar,
          totalLeads,
          siteVisits,
          bookings,
          conversionRate,
        };
      }),
    );

    return entries
      .filter((e) => e.totalLeads > 0)
      .sort((a, b) => b.bookings - a.bookings || b.totalLeads - a.totalLeads)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }

  async getFunnel(tenantId: string, projectId?: string) {
    const statuses = [
      "NEW",
      "CONTACTED",
      "INTERESTED",
      "SITE_VISIT",
      "NEGOTIATION",
      "BOOKING",
      "REGISTRATION",
    ] as const;

    const counts = await Promise.all(
      statuses.map((status) =>
        this.prisma.lead.count({
          where: {
            tenantId,
            status,
            isArchived: false,
            ...(projectId && { projectId }),
          },
        }),
      ),
    );

    return statuses.map((stage, i) => ({
      stage,
      count: counts[i] ?? 0,
    }));
  }

  async getSourceBreakdown(tenantId: string, projectId?: string) {
    const groups = await this.prisma.lead.groupBy({
      by: ["source"],
      where: { tenantId, isArchived: false, ...(projectId && { projectId }) },
      _count: { id: true },
    });

    return groups.map((g) => ({
      source: g.source,
      count: g._count.id,
    }));
  }

  async getClashLeads(tenantId: string, status?: string) {
    return this.prisma.clashLead.findMany({
      where: {
        tenantId,
        ...(status && { status: status as "PENDING" | "RESOLVED" | "DISMISSED" }),
      },
      include: {
        leadA: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            assignedTo: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        leadB: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            assignedTo: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { detectedAt: "desc" },
    });
  }

  async resolveClash(
    tenantId: string,
    id: string,
    assignedToId: string,
    userId: string,
  ) {
    const clash = await this.prisma.clashLead.findFirst({
      where: { id, tenantId },
    });
    if (!clash) throw new NotFoundException("Clash lead not found");

    await this.prisma.lead.update({
      where: { id: clash.leadBId },
      data: { assignedToId, isArchived: true, status: "LOST" },
    });

    return this.prisma.clashLead.update({
      where: { id },
      data: {
        status: "RESOLVED",
        assignedToId,
        resolvedById: userId,
        resolvedAt: new Date(),
      },
    });
  }

  async dismissClash(tenantId: string, id: string, userId: string) {
    const clash = await this.prisma.clashLead.findFirst({
      where: { id, tenantId },
    });
    if (!clash) throw new NotFoundException("Clash lead not found");

    return this.prisma.clashLead.update({
      where: { id },
      data: {
        status: "DISMISSED",
        resolvedById: userId,
        resolvedAt: new Date(),
      },
    });
  }

  private dateRange(dateFrom?: string, dateTo?: string): { createdAt?: Prisma.DateTimeFilter } {
    if (!dateFrom && !dateTo) return {};
    const createdAt: Prisma.DateTimeFilter = {};
    if (dateFrom) createdAt.gte = new Date(dateFrom);
    if (dateTo) createdAt.lte = new Date(dateTo);
    return { createdAt };
  }
}
