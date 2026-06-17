import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getPaginationParams } from "@propos/shared-utils";
import { PrismaService } from "../../../database/prisma.service";
import { paginate } from "../../../common/utils/paginate";
import {
  CreateSiteVisitDto,
  FilterSiteVisitDto,
  UpdateSiteVisitDto,
} from "./dto/site-visit.dto";

@Injectable()
export class SiteVisitsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, filter: FilterSiteVisitDto) {
    const { skip, take, page, limit } = getPaginationParams(
      filter.page,
      filter.limit,
    );

    const where: Prisma.SiteVisitWhereInput = {
      lead: { tenantId },
      ...(filter.leadId && { leadId: filter.leadId }),
      ...(filter.status && { status: filter.status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.siteVisit.findMany({
        where,
        skip,
        take,
        orderBy: { scheduledAt: "asc" },
        include: {
          lead: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
        },
      }),
      this.prisma.siteVisit.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async create(tenantId: string, dto: CreateSiteVisitDto) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: dto.leadId, tenantId },
    });
    if (!lead) throw new NotFoundException("Lead not found");

    return this.prisma.siteVisit.create({
      data: {
        leadId: dto.leadId,
        projectId: dto.projectId,
        scheduledAt: new Date(dto.scheduledAt),
        attendedBy: dto.attendedBy,
      },
      include: { lead: true },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateSiteVisitDto) {
    const existing = await this.prisma.siteVisit.findFirst({
      where: { id, lead: { tenantId } },
    });
    if (!existing) throw new NotFoundException("Site visit not found");

    return this.prisma.siteVisit.update({
      where: { id },
      data: {
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        completedAt: dto.completedAt ? new Date(dto.completedAt) : undefined,
      },
      include: { lead: true },
    });
  }
}
