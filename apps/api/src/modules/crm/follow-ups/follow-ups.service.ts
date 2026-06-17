import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getPaginationParams } from "@propos/shared-utils";
import { PrismaService } from "../../../database/prisma.service";
import { paginate } from "../../../common/utils/paginate";
import {
  CreateFollowUpDto,
  FilterFollowUpDto,
  UpdateFollowUpDto,
} from "./dto/follow-up.dto";

@Injectable()
export class FollowUpsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, filter: FilterFollowUpDto) {
    const { skip, take, page, limit } = getPaginationParams(
      filter.page,
      filter.limit,
    );

    const where: Prisma.FollowUpWhereInput = {
      lead: { tenantId },
      ...(filter.leadId && { leadId: filter.leadId }),
      ...(filter.status && { status: filter.status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.followUp.findMany({
        where,
        skip,
        take,
        orderBy: { scheduledAt: "asc" },
        include: {
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.followUp.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async create(tenantId: string, userId: string, dto: CreateFollowUpDto) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: dto.leadId, tenantId },
    });
    if (!lead) throw new NotFoundException("Lead not found");

    return this.prisma.followUp.create({
      data: {
        leadId: dto.leadId,
        userId,
        type: dto.type,
        scheduledAt: new Date(dto.scheduledAt),
        notes: dto.notes,
      },
      include: { lead: true },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateFollowUpDto) {
    const existing = await this.prisma.followUp.findFirst({
      where: { id, lead: { tenantId } },
    });
    if (!existing) throw new NotFoundException("Follow-up not found");

    return this.prisma.followUp.update({
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
