import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma.service";

@Injectable()
export class LmsReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async callLogReport(tenantId: string, filters: ReportFilters) {
    const logs = await this.prisma.callLog.findMany({
      where: {
        lead: {
          tenantId,
          ...(filters.projectId && { projectId: filters.projectId }),
        },
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.status && { status: filters.status as never }),
        ...this.dateFilter(filters),
      },
      include: {
        lead: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
            project: { select: { name: true } },
          },
        },
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { calledAt: "desc" },
      take: 500,
    });

    return logs.map((log) => ({
      leadName: `${log.lead.firstName} ${log.lead.lastName ?? ""}`.trim(),
      phone: log.lead.phone,
      callType: log.direction,
      duration: log.duration,
      status: log.status,
      salesPerson: `${log.user.firstName} ${log.user.lastName}`,
      dateTime: log.calledAt,
      notes: log.notes,
      project: log.lead.project?.name,
    }));
  }

  async siteVisitReport(tenantId: string, filters: ReportFilters) {
    const visits = await this.prisma.siteVisit.findMany({
      where: {
        lead: { tenantId },
        ...(filters.projectId && { projectId: filters.projectId }),
        ...(filters.userId && { attendedBy: filters.userId }),
        ...(filters.outcome && { outcome: filters.outcome as never }),
        ...this.dateFilter(filters, "scheduledAt"),
      },
      include: {
        lead: { select: { firstName: true, lastName: true } },
        project: { select: { name: true } },
        ypsrReport: { select: { id: true } },
      },
      orderBy: { scheduledAt: "desc" },
      take: 500,
    });

    return visits.map((v) => ({
      leadName: `${v.lead.firstName} ${v.lead.lastName ?? ""}`.trim(),
      project: v.project.name,
      visitDate: v.scheduledAt,
      salesPerson: v.attendedBy,
      interestLevel: v.ypsrReport ? "SUBMITTED" : v.outcome,
      outcome: v.outcome,
      ypsrSubmitted: !!v.ypsrReport,
    }));
  }

  async digitalHoardingReport(tenantId: string, filters: ReportFilters) {
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        tenantId,
        type: { in: ["FACEBOOK", "GOOGLE", "EMAIL"] },
        ...this.dateFilter(filters),
      },
      take: 500,
    });

    return campaigns.map((c) => {
      const metrics = (c.metrics ?? {}) as Record<string, number>;
      const leadsGenerated = metrics["leadsGenerated"] ?? 0;
      return {
        campaignName: c.name,
        platform: c.type,
        location: JSON.stringify(c.targetAudience ?? {}),
        impressions: metrics["impressions"] ?? 0,
        clicks: metrics["clicks"] ?? 0,
        leadsGenerated,
        cpl: leadsGenerated ? Number(c.budget ?? 0) / leadsGenerated : 0,
        date: c.startDate,
      };
    });
  }

  async digitalEnquiryReport(tenantId: string, filters: ReportFilters) {
    const leads = await this.prisma.lead.findMany({
      where: {
        tenantId,
        source: { in: ["FACEBOOK", "GOOGLE", "PORTAL", "WEBSITE"] },
        ...(filters.source && { source: filters.source as never }),
        ...(filters.status && { status: filters.status as never }),
        ...this.dateFilter(filters),
      },
      include: {
        project: { select: { name: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return leads.map((l) => ({
      leadName: `${l.firstName} ${l.lastName ?? ""}`.trim(),
      source: l.source,
      campaign: l.utmCampaign,
      utmMedium: l.utmMedium,
      project: l.project?.name,
      status: l.status,
      assignedTo: l.assignedTo
        ? `${l.assignedTo.firstName} ${l.assignedTo.lastName}`
        : "Unassigned",
      date: l.createdAt,
    }));
  }

  async leadTrackingReport(tenantId: string, filters: ReportFilters) {
    const leads = await this.prisma.lead.findMany({
      where: {
        tenantId,
        isArchived: false,
        ...(filters.leadLabel && { leadLabel: filters.leadLabel as never }),
        ...(filters.status && { status: filters.status as never }),
        ...(filters.userId && { assignedToId: filters.userId }),
        ...this.dateFilter(filters),
      },
      include: {
        assignedTo: { select: { firstName: true, lastName: true } },
        followUps: { select: { id: true, completedAt: true, scheduledAt: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });

    return leads.map((l) => {
      const completed = l.followUps.filter((f) => f.completedAt).length;
      const nextFollowUp = l.followUps
        .filter((f) => !f.completedAt)
        .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0];

      return {
        leadName: `${l.firstName} ${l.lastName ?? ""}`.trim(),
        leadLevel: l.leadLabel,
        stage: l.status,
        followUpsDone: completed,
        lastContact: l.updatedAt,
        nextFollowUp: nextFollowUp?.scheduledAt,
        salesPerson: l.assignedTo
          ? `${l.assignedTo.firstName} ${l.assignedTo.lastName}`
          : "Unassigned",
      };
    });
  }

  async daReport(tenantId: string, filters: ReportFilters) {
    const date = filters.dateFrom
      ? new Date(filters.dateFrom)
      : new Date();
    date.setHours(0, 0, 0, 0);

    const reports = await this.prisma.daReport.findMany({
      where: {
        tenantId,
        reportDate: date,
        ...(filters.userId && { userId: filters.userId }),
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    if (reports.length > 0) {
      return reports.map((r) => ({
        salesPerson: `${r.user.firstName} ${r.user.lastName}`,
        callsMade: r.callsMade,
        leadsContacted: r.leadsContacted,
        siteVisits: r.siteVisits,
        followUpsDone: r.followUpsDone,
        newLeadsAssigned: r.newLeadsAssigned,
        date: r.reportDate,
      }));
    }

    return this.generateDaReportLive(tenantId, date, filters.userId);
  }

  private async generateDaReportLive(
    tenantId: string,
    date: Date,
    userId?: string,
  ) {
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const users = await this.prisma.user.findMany({
      where: { tenantId, status: "ACTIVE", ...(userId && { id: userId }) },
      select: { id: true, firstName: true, lastName: true },
    });

    return Promise.all(
      users.map(async (user) => {
        const [callsMade, leadsContacted, siteVisits, followUpsDone, newLeadsAssigned] =
          await Promise.all([
            this.prisma.callLog.count({
              where: { userId: user.id, calledAt: { gte: date, lte: dayEnd } },
            }),
            this.prisma.activity.count({
              where: {
                userId: user.id,
                module: "crm",
                createdAt: { gte: date, lte: dayEnd },
              },
            }),
            this.prisma.siteVisit.count({
              where: {
                attendedBy: user.id,
                completedAt: { gte: date, lte: dayEnd },
              },
            }),
            this.prisma.followUp.count({
              where: {
                userId: user.id,
                completedAt: { gte: date, lte: dayEnd },
              },
            }),
            this.prisma.lead.count({
              where: {
                tenantId,
                assignedToId: user.id,
                createdAt: { gte: date, lte: dayEnd },
              },
            }),
          ]);

        return {
          salesPerson: `${user.firstName} ${user.lastName}`,
          callsMade,
          leadsContacted,
          siteVisits,
          followUpsDone,
          newLeadsAssigned,
          date,
        };
      }),
    );
  }

  private dateFilter(
    filters: ReportFilters,
    field: "createdAt" | "scheduledAt" | "calledAt" = "createdAt",
  ) {
    if (!filters.dateFrom && !filters.dateTo) return {};
    const range: { gte?: Date; lte?: Date } = {};
    if (filters.dateFrom) range.gte = new Date(filters.dateFrom);
    if (filters.dateTo) range.lte = new Date(filters.dateTo);
    return { [field]: range };
  }
}

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  projectId?: string;
  status?: string;
  source?: string;
  outcome?: string;
  leadLabel?: string;
}
