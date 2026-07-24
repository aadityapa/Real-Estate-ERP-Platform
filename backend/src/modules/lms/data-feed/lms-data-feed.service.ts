import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { getPaginationParams } from "@propos/shared-utils";
import { PrismaService } from "../../../database/prisma.service";
import { cursorPaginate } from "../../../common/utils/cursor-paginate";
import { paginate } from "../../../common/utils/paginate";
import { EventsService } from "../../events/events.service";

@Injectable()
export class LmsDataFeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  async getFeed(
    tenantId: string,
    status?: string,
    page = 1,
    limit = 20,
    source?: string,
    projectId?: string,
    search?: string,
    cursor?: string,
  ) {
    const { skip, take, page: safePage, limit: safeLimit } = getPaginationParams(
      page,
      limit,
    );

    const where = {
      tenantId,
      isArchived: false,
      ...(source && { source: source as never }),
      ...(projectId && { projectId }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search } },
        ],
      }),
      ...(status === "UNCLAIMED" && { assignedToId: null }),
      ...(status === "CLAIMED" && { assignedToId: { not: null } }),
    };

    const orderBy = [
      { feedScore: "desc" as const },
      { createdAt: "desc" as const },
      { id: "desc" as const },
    ];

    const feedInclude = {
      project: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, firstName: true, lastName: true } },
      claimedBy: { select: { id: true, firstName: true, lastName: true } },
    };

    const enrich = <T extends { assignedToId: string | null; createdAt: Date }>(
      items: T[],
    ) =>
      items.map((lead) => ({
        ...lead,
        claimStatus: lead.assignedToId ? "CLAIMED" : "UNCLAIMED",
        minutesSinceCreation: Math.floor(
          (Date.now() - lead.createdAt.getTime()) / 60000,
        ),
        isAging:
          !lead.assignedToId &&
          Date.now() - lead.createdAt.getTime() > 30 * 60000,
      }));

    if (cursor) {
      const rows = await this.prisma.lead.findMany({
        where,
        take: take + 1,
        skip: 1,
        cursor: { id: cursor },
        orderBy,
        include: feedInclude,
      });
      const pageResult = cursorPaginate(rows, take, (r) => r.id);
      return { ...pageResult, data: enrich(pageResult.data) };
    }

    const [items, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        skip,
        take,
        orderBy,
        include: feedInclude,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return paginate(enrich(items), total, safePage, safeLimit);
  }

  async getMyClaimed(tenantId: string, userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.prisma.lead.findMany({
      where: {
        tenantId,
        claimedById: userId,
        claimedAt: { gte: today },
        isArchived: false,
      },
      include: {
        project: { select: { id: true, name: true } },
      },
      orderBy: { claimedAt: "desc" },
      take: 100,
    });
  }

  async getStats(tenantId: string, userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const agingThreshold = new Date(Date.now() - 30 * 60000);

    const [unclaimed, claimed, myClaimed, agingCount] = await Promise.all([
      this.prisma.lead.count({
        where: { tenantId, assignedToId: null, isArchived: false },
      }),
      this.prisma.lead.count({
        where: { tenantId, assignedToId: { not: null }, isArchived: false },
      }),
      this.prisma.lead.count({
        where: { tenantId, claimedById: userId, claimedAt: { gte: today } },
      }),
      this.prisma.lead.count({
        where: {
          tenantId,
          assignedToId: null,
          isArchived: false,
          createdAt: { lte: agingThreshold },
        },
      }),
    ]);

    return { unclaimed, claimed, myClaimed, agingCount };
  }

  async claimLead(tenantId: string, leadId: string, userId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId, isArchived: false },
    });
    if (!lead) throw new NotFoundException("Lead not found");
    if (lead.assignedToId) throw new ConflictException("Lead already claimed");

    const now = new Date();
    const history = Array.isArray(lead.claimHistory)
      ? (lead.claimHistory as object[])
      : [];

    const updated = await this.prisma.lead.update({
      where: { id: leadId, assignedToId: null },
      data: {
        assignedToId: userId,
        claimedById: userId,
        claimedAt: now,
        claimHistory: [...history, { userId, claimedAt: now.toISOString() }],
      },
      include: {
        project: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    this.events.emitLeadClaimed(tenantId, {
      leadId,
      claimedBy: userId,
      claimedAt: now.toISOString(),
    });

    return updated;
  }

  async releaseLead(tenantId: string, leadId: string, userId: string, roles: string[]) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
    });
    if (!lead) throw new NotFoundException("Lead not found");

    const isManager = roles.some((r) =>
      ["Super Admin", "Admin", "Sales Manager"].includes(r),
    );
    const withinWindow =
      lead.claimedAt && Date.now() - lead.claimedAt.getTime() < 5 * 60000;

    if (lead.claimedById !== userId && !isManager) {
      throw new ForbiddenException("Cannot release this lead");
    }
    if (!isManager && !withinWindow) {
      throw new ForbiddenException("Release window expired (5 minutes)");
    }

    const updated = await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        assignedToId: null,
        claimedById: null,
        claimReleasedAt: new Date(),
      },
    });

    this.events.emitLeadReleased(tenantId, { leadId });
    return updated;
  }
}
