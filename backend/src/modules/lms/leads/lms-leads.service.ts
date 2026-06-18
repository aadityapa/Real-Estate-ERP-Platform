import { Injectable, NotFoundException } from "@nestjs/common";
import { getPaginationParams } from "@propos/shared-utils";
import { PrismaService } from "../../../database/prisma.service";
import { paginate } from "../../../common/utils/paginate";

@Injectable()
export class LmsLeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async findEnhanced(tenantId: string, filter: {
    page?: number;
    limit?: number;
    search?: string;
    leadLabel?: string;
    projectId?: string;
    callStatus?: string;
  }) {
    const { skip, take, page, limit } = getPaginationParams(filter.page, filter.limit);

    const where = {
      tenantId,
      isArchived: false,
      ...(filter.leadLabel && { leadLabel: filter.leadLabel as never }),
      ...(filter.projectId && { projectId: filter.projectId }),
      ...(filter.callStatus && { leadCallStatus: filter.callStatus as never }),
      ...(filter.search && {
        OR: [
          { firstName: { contains: filter.search, mode: "insensitive" as const } },
          { phone: { contains: filter.search } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: "desc" },
        include: {
          project: { select: { id: true, name: true } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          followUps: {
            where: { status: "SCHEDULED" },
            orderBy: { scheduledAt: "asc" },
            take: 1,
          },
        },
      }),
      this.prisma.lead.count({ where }),
    ]);

    const mapped = items.map((lead) => ({
      id: lead.id,
      clientName: `${lead.firstName} ${lead.lastName ?? ""}`.trim(),
      leadId: lead.id.slice(-8).toUpperCase(),
      projectName: lead.project?.name ?? "—",
      leadLabel: lead.leadLabel,
      leadRat: lead.leadRat,
      followUp: lead.followUps[0]?.scheduledAt ?? null,
      callStatus: lead.leadCallStatus,
      phone: lead.phone,
      description: lead.description,
      status: lead.status,
      assignedTo: lead.assignedTo,
    }));

    return paginate(mapped, total, page, limit);
  }

  async getTracking(tenantId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
      include: {
        project: { select: { id: true, name: true } },
        followUps: { orderBy: { scheduledAt: "desc" }, take: 20 },
        callLogs: { orderBy: { calledAt: "desc" }, take: 20 },
        siteVisits: { orderBy: { scheduledAt: "desc" }, take: 10 },
        activities: { orderBy: { createdAt: "desc" }, take: 30 },
      },
    });
    if (!lead) throw new NotFoundException("Lead not found");

    const timeline = [
      ...lead.callLogs.map((c) => ({
        type: "call",
        date: c.calledAt,
        title: `Call: ${c.status}`,
        detail: c.notes,
        duration: c.duration,
      })),
      ...lead.siteVisits.map((v) => ({
        type: "visit",
        date: v.scheduledAt,
        title: `Site Visit: ${v.status}`,
        detail: v.feedback,
      })),
      ...lead.followUps.map((f) => ({
        type: "followup",
        date: f.scheduledAt,
        title: `Follow-up: ${f.type}`,
        detail: f.notes,
      })),
      ...lead.activities.map((a) => ({
        type: "activity",
        date: a.createdAt,
        title: a.action,
        detail: a.description,
      })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    return { lead, timeline };
  }

  async dismiss(
    tenantId: string,
    leadId: string,
    userId: string,
    dto: { reason: string; notes?: string },
  ) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
    });
    if (!lead) throw new NotFoundException("Lead not found");

    const [updated] = await this.prisma.$transaction([
      this.prisma.lead.update({
        where: { id: leadId },
        data: {
          status: "LOST",
          leadLabel: "LOST",
          isArchived: true,
          dismissReason: dto.reason as never,
          dismissNotes: dto.notes,
        },
      }),
      this.prisma.activity.create({
        data: {
          userId,
          leadId,
          module: "lms",
          action: "lead.dismissed",
          description: `Lead dismissed: ${dto.reason}`,
          metadata: { reason: dto.reason, notes: dto.notes },
        },
      }),
    ]);

    return updated;
  }

  async updateLabel(
    tenantId: string,
    leadId: string,
    leadLabel: string,
    leadCallStatus?: string,
  ) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
    });
    if (!lead) throw new NotFoundException("Lead not found");

    return this.prisma.lead.update({
      where: { id: leadId },
      data: {
        leadLabel: leadLabel as never,
        ...(leadCallStatus && { leadCallStatus: leadCallStatus as never }),
      },
    });
  }
}
