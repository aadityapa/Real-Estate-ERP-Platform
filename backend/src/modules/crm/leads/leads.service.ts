import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { JwtPayload } from "@propos/shared-types";
import { getPaginationParams } from "@propos/shared-utils";
import { PrismaService } from "../../../database/prisma.service";
import {
  cursorPaginate,
  type CursorPaginatedResult,
} from "../../../common/utils/cursor-paginate";
import {
  paginate,
  type PaginatedResult,
} from "../../../common/utils/paginate";
import { isCrmLeadManager } from "../../../common/constants/permissions";
import { CacheService } from "../../../common/redis/cache.service";
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

type LeadListItem = Prisma.LeadGetPayload<{ include: typeof leadInclude }>;

const LEAD_SORT_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "status",
  "source",
  "score",
  "firstName",
]);

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
    private readonly cache: CacheService,
  ) {}

  private buildListWhere(
    tenantId: string,
    filter: FilterLeadDto,
  ): Prisma.LeadWhereInput {
    return {
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
  }

  async findAll(
    tenantId: string,
    filter: FilterLeadDto & { cursor: string },
  ): Promise<CursorPaginatedResult<LeadListItem>>;
  async findAll(
    tenantId: string,
    filter: FilterLeadDto,
  ): Promise<PaginatedResult<LeadListItem>>;
  async findAll(
    tenantId: string,
    filter: FilterLeadDto,
  ): Promise<PaginatedResult<LeadListItem> | CursorPaginatedResult<LeadListItem>> {
    const where = this.buildListWhere(tenantId, filter);
    const sortBy = LEAD_SORT_FIELDS.has(filter.sortBy ?? "")
      ? (filter.sortBy as string)
      : "createdAt";
    const order = filter.order ?? "desc";
    const { take, page, limit } = getPaginationParams(filter.page, filter.limit);

    // Cursor / keyset path — 1 query (no COUNT); stable for deep lists.
    if (filter.cursor) {
      const rows = await this.prisma.lead.findMany({
        where,
        take: take + 1,
        skip: 1,
        cursor: { id: filter.cursor },
        orderBy: [{ [sortBy]: order }, { id: order }],
        include: leadInclude,
      });
      return cursorPaginate(rows, take, (r) => r.id);
    }

    const [items, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        skip: (page - 1) * take,
        take,
        orderBy: [{ [sortBy]: order }, { id: order }],
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
      this.eventsService.emitNewLeadToFeed(tenantId, {
        id: lead.id,
        firstName: lead.firstName,
        phone: lead.phone,
        source: lead.source,
      });

      await this.cache.invalidate(tenantId, "crm", "lms");

      return lead;
    } catch (error) {
      this.logger.error("Failed to create lead", { tenantId, userId, error });
      throw error;
    }
  }

  async update(
    tenantId: string,
    user: Pick<JwtPayload, "userId" | "roles" | "permissions">,
    id: string,
    dto: UpdateLeadDto,
  ) {
    const existing = await this.findOne(tenantId, id);
    this.assertCanEditLead(existing.assignedToId, user);

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
          userId: user.userId,
          leadId: id,
          module: "crm",
          action: "status_change",
          description: `Lead status changed to ${dto.status}`,
          metadata: { status: dto.status },
        },
      });
    }

    await this.cache.invalidate(tenantId, "crm", "lms");
    return lead;
  }

  /**
   * Reps may only edit leads assigned to them; managers (role or crm:manage:leads) may edit any.
   */
  assertCanEditLead(
    assignedToId: string | null,
    user: Pick<JwtPayload, "userId" | "roles" | "permissions">,
  ): void {
    if (isCrmLeadManager(user.roles, user.permissions)) {
      return;
    }
    if (assignedToId !== user.userId) {
      throw new ForbiddenException(
        "You can only edit leads assigned to you",
      );
    }
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

    await this.cache.invalidate(tenantId, "crm", "lms");
    return lead;
  }

  async archive(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    const lead = await this.prisma.lead.update({
      where: { id },
      data: { isArchived: true },
      include: leadInclude,
    });
    await this.cache.invalidate(tenantId, "crm", "lms");
    return lead;
  }

  /**
   * CRM dashboard — fixed 5 parallel aggregations (no per-row loops).
   * Cached with short TTL + stampede lock; invalidated on lead writes.
   */
  async getDashboardStats(tenantId: string) {
    const key = await this.cache.buildKey(tenantId, "crm", ["dashboard"]);
    return this.cache.getOrSet(key, () => this.computeDashboardStats(tenantId));
  }

  private async computeDashboardStats(tenantId: string) {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date();
    dayEnd.setHours(23, 59, 59, 999);

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
            scheduledAt: { gte: dayStart, lt: dayEnd },
          },
        }),
        this.prisma.siteVisit.count({
          where: {
            lead: { tenantId },
            scheduledAt: { gte: dayStart, lt: dayEnd },
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
