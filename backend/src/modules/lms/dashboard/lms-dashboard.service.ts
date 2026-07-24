import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CacheService } from "../../../common/redis/cache.service";
import { PrismaService } from "../../../database/prisma.service";
import { FeatureFlagService } from "../../platform/feature-flag.service";

@Injectable()
export class LmsDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly featureFlags: FeatureFlagService,
  ) {}

  async getCounters(tenantId: string, projectId?: string, dateFrom?: string, dateTo?: string) {
    const key = await this.cache.buildKey(tenantId, "lms", [
      "counters",
      projectId ?? "all",
      dateFrom ?? "",
      dateTo ?? "",
    ]);
    return this.cache.getOrSet(key, () =>
      this.computeCounters(tenantId, projectId, dateFrom, dateTo),
    );
  }

  private async computeCounters(
    tenantId: string,
    projectId?: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
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

  /**
   * Leaderboard without N+1: 3 groupBy aggregations + 1 user fetch
   * (was 1 + 3×N queries per active user).
   */
  async getLeaderboard(
    tenantId: string,
    month?: number,
    year?: number,
    projectId?: string,
  ) {
    const now = new Date();
    const m = month ?? now.getMonth() + 1;
    const y = year ?? now.getFullYear();
    const key = await this.cache.buildKey(tenantId, "lms", [
      "leaderboard",
      String(m),
      String(y),
      projectId ?? "all",
    ]);
    return this.cache.getOrSet(key, () =>
      this.computeLeaderboard(tenantId, m, y, projectId),
    );
  }

  private async computeLeaderboard(
    tenantId: string,
    m: number,
    y: number,
    projectId?: string,
  ) {
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);

    const leadWhere: Prisma.LeadWhereInput = {
      tenantId,
      assignedToId: { not: null },
      isArchived: false,
      createdAt: { gte: start, lte: end },
      ...(projectId && { projectId }),
    };

    const [leadGroups, visitGroups, bookingGroups] = await Promise.all([
      this.prisma.lead.groupBy({
        by: ["assignedToId"],
        where: leadWhere,
        _count: { id: true },
      }),
      this.prisma.siteVisit.groupBy({
        by: ["attendedBy"],
        where: {
          attendedBy: { not: null },
          status: "COMPLETED",
          completedAt: { gte: start, lte: end },
          lead: { tenantId },
        },
        _count: { id: true },
      }),
      this.prisma.booking.groupBy({
        by: ["salesPersonId"],
        where: {
          createdAt: { gte: start, lte: end },
          lead: { tenantId, ...(projectId && { projectId }) },
        },
        _count: { id: true },
      }),
    ]);

    const leadCountByUser = new Map(
      leadGroups
        .filter((g) => g.assignedToId)
        .map((g) => [g.assignedToId as string, g._count.id]),
    );
    const visitCountByUser = new Map(
      visitGroups
        .filter((g) => g.attendedBy)
        .map((g) => [g.attendedBy as string, g._count.id]),
    );
    const bookingCountByUser = new Map(
      bookingGroups.map((g) => [g.salesPersonId, g._count.id]),
    );

    const userIds = [...new Set([...leadCountByUser.keys()])];
    if (userIds.length === 0) return [];

    const users = await this.prisma.user.findMany({
      where: { tenantId, status: "ACTIVE", id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, avatar: true },
    });

    const entries = users.map((user) => {
      const totalLeads = leadCountByUser.get(user.id) ?? 0;
      const siteVisits = visitCountByUser.get(user.id) ?? 0;
      const bookings = bookingCountByUser.get(user.id) ?? 0;
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
    });

    return entries
      .filter((e) => e.totalLeads > 0)
      .sort((a, b) => b.bookings - a.bookings || b.totalLeads - a.totalLeads)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }

  /** Single groupBy instead of one count per funnel stage. */
  async getFunnel(tenantId: string, projectId?: string) {
    const key = await this.cache.buildKey(tenantId, "lms", [
      "funnel",
      projectId ?? "all",
    ]);
    return this.cache.getOrSet(key, async () => {
      const statuses = [
        "NEW",
        "CONTACTED",
        "INTERESTED",
        "SITE_VISIT",
        "NEGOTIATION",
        "BOOKING",
        "REGISTRATION",
      ] as const;

      const groups = await this.prisma.lead.groupBy({
        by: ["status"],
        where: {
          tenantId,
          isArchived: false,
          status: { in: [...statuses] },
          ...(projectId && { projectId }),
        },
        _count: { id: true },
      });

      const countByStatus = new Map(
        groups.map((g) => [g.status, g._count.id] as const),
      );

      return statuses.map((stage) => ({
        stage,
        count: countByStatus.get(stage) ?? 0,
      }));
    });
  }

  async getSourceBreakdown(tenantId: string, projectId?: string) {
    const key = await this.cache.buildKey(tenantId, "lms", [
      "source",
      projectId ?? "all",
    ]);
    return this.cache.getOrSet(key, async () => {
      const groups = await this.prisma.lead.groupBy({
        by: ["source"],
        where: { tenantId, isArchived: false, ...(projectId && { projectId }) },
        _count: { id: true },
      });

      return groups.map((g) => ({
        source: g.source,
        count: g._count.id,
      }));
    });
  }

  async getClashLeads(tenantId: string, status?: string) {
    const enabled = await this.featureFlags.isEnabled(
      tenantId,
      "lms_clash_detection",
    );
    if (!enabled) return [];

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
