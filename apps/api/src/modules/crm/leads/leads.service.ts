import {
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getPaginationParams } from "@propos/shared-utils";
import { PrismaService } from "../../../database/prisma.service";
import { paginate } from "../../../common/utils/paginate";
import { EventsService } from "../../events/events.service";
import {
  AssignLeadDto,
  CreateLeadDto,
  FilterLeadDto,
  UpdateLeadDto,
} from "./dto/lead.dto";

const leadInclude = {
  assignedTo: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  project: { select: { id: true, name: true, code: true } },
  _count: { select: { followUps: true, siteVisits: true } },
} satisfies Prisma.LeadInclude;

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  async findAll(tenantId: string, filter: FilterLeadDto) {
    const { skip, take, page, limit } = getPaginationParams(
      filter.page,
      filter.limit,
    );

    const where: Prisma.LeadWhereInput = {
      tenantId,
      isArchived: false,
      ...(filter.status && { status: filter.status }),
      ...(filter.source && { source: filter.source }),
      ...(filter.assignedToId && { assignedToId: filter.assignedToId }),
      ...(filter.projectId && { projectId: filter.projectId }),
      ...(filter.search && {
        OR: [
          { firstName: { contains: filter.search, mode: "insensitive" } },
          { lastName: { contains: filter.search, mode: "insensitive" } },
          { phone: { contains: filter.search } },
          { email: { contains: filter.search, mode: "insensitive" } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        skip,
        take,
        orderBy: { [filter.sortBy ?? "createdAt"]: filter.order ?? "desc" },
        include: leadInclude,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async findByStatus(tenantId: string) {
    const groups = await this.prisma.lead.groupBy({
      by: ["status"],
      where: { tenantId, isArchived: false },
      _count: { id: true },
    });

    return groups.map((g) => ({
      status: g.status,
      count: g._count.id,
    }));
  }

  async findOne(tenantId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId },
      include: {
        ...leadInclude,
        followUps: { orderBy: { scheduledAt: "desc" }, take: 10 },
        siteVisits: { orderBy: { scheduledAt: "desc" }, take: 10 },
        activities: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });

    if (!lead) {
      throw new NotFoundException("Lead not found");
    }

    return lead;
  }

  async create(tenantId: string, userId: string, dto: CreateLeadDto) {
    try {
      const lead = await this.prisma.lead.create({
        data: {
          tenantId,
          ...dto,
          budget: dto.budget as Prisma.InputJsonValue | undefined,
          requirements: dto.requirements as Prisma.InputJsonValue | undefined,
        },
        include: leadInclude,
      });

      await this.prisma.activity.create({
        data: {
          userId,
          leadId: lead.id,
          module: "crm",
          action: "create",
          description: `Lead created: ${lead.firstName} ${lead.lastName ?? ""}`.trim(),
        },
      });

      this.eventsService.emitLeadCreated(tenantId, {
        id: lead.id,
        firstName: lead.firstName,
      });

      return lead;
    } catch (error) {
      this.logger.error("Failed to create lead", { tenantId, userId, error });
      throw error;
    }
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateLeadDto) {
    await this.findOne(tenantId, id);

    const lead = await this.prisma.lead.update({
      where: { id },
      data: {
        ...dto,
        budget: dto.budget as Prisma.InputJsonValue | undefined,
        requirements: dto.requirements as Prisma.InputJsonValue | undefined,
      },
      include: leadInclude,
    });

    if (dto.status) {
      await this.prisma.activity.create({
        data: {
          userId,
          leadId: id,
          module: "crm",
          action: "status_change",
          description: `Lead status changed to ${dto.status}`,
          metadata: { status: dto.status },
        },
      });
    }

    return lead;
  }

  async assign(tenantId: string, userId: string, id: string, dto: AssignLeadDto) {
    await this.findOne(tenantId, id);

    const lead = await this.prisma.lead.update({
      where: { id },
      data: { assignedToId: dto.assignedToId },
      include: leadInclude,
    });

    await this.prisma.activity.create({
      data: {
        userId,
        leadId: id,
        module: "crm",
        action: "assign",
        description: "Lead reassigned",
        metadata: { assignedToId: dto.assignedToId },
      },
    });

    return lead;
  }

  async archive(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.lead.update({
      where: { id },
      data: { isArchived: true },
      include: leadInclude,
    });
  }

  async getDashboardStats(tenantId: string) {
    const [total, bySource, byStatus, todayFollowUps, siteVisitsToday] =
      await Promise.all([
        this.prisma.lead.count({ where: { tenantId, isArchived: false } }),
        this.prisma.lead.groupBy({
          by: ["source"],
          where: { tenantId, isArchived: false },
          _count: { id: true },
        }),
        this.prisma.lead.groupBy({
          by: ["status"],
          where: { tenantId, isArchived: false },
          _count: { id: true },
        }),
        this.prisma.followUp.count({
          where: {
            lead: { tenantId },
            scheduledAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          },
        }),
        this.prisma.siteVisit.count({
          where: {
            lead: { tenantId },
            scheduledAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(23, 59, 59, 999)),
            },
          },
        }),
      ]);

    const conversionRate =
      total > 0
        ? Math.round(
            ((byStatus.find((s) => s.status === "BOOKING")?._count.id ?? 0) /
              total) *
              100,
          )
        : 0;

    return {
      totalLeads: total,
      leadsBySource: bySource.map((s) => ({
        source: s.source,
        count: s._count.id,
      })),
      leadsByStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
      followUpsToday: todayFollowUps,
      siteVisitsToday,
      conversionRate,
    };
  }
}
