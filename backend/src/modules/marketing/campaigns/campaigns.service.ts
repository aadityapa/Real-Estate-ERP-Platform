import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getPaginationParams } from "@propos/shared-utils";
import { PrismaService } from "../../../database/prisma.service";
import { paginate } from "../../../common/utils/paginate";
import { CreateCampaignDto, FilterCampaignDto, UpdateCampaignDto } from "./dto/campaign.dto";

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, filter: FilterCampaignDto) {
    const { skip, take, page, limit } = getPaginationParams(filter.page, filter.limit);
    const where: Prisma.CampaignWhereInput = {
      tenantId,
      ...(filter.projectId && { projectId: filter.projectId }),
      ...(filter.status && { status: filter.status }),
      ...(filter.search && { name: { contains: filter.search, mode: "insensitive" } }),
    };
    const [items, total] = await Promise.all([
      this.prisma.campaign.findMany({ where, skip, take, orderBy: { [filter.sortBy ?? "createdAt"]: filter.order ?? "desc" } }),
      this.prisma.campaign.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({ where: { id, tenantId } });
    if (!campaign) throw new NotFoundException("Campaign not found");
    return campaign;
  }

  async create(tenantId: string, dto: CreateCampaignDto) {
    return this.prisma.campaign.create({
      data: {
        tenantId,
        ...dto,
        targetAudience: dto.targetAudience as Prisma.InputJsonValue | undefined,
        content: dto.content as Prisma.InputJsonValue | undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateCampaignDto) {
    await this.findOne(tenantId, id);
    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...dto,
        content: dto.content as Prisma.InputJsonValue | undefined,
        metrics: dto.metrics as Prisma.InputJsonValue | undefined,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.campaign.update({ where: { id }, data: { status: "COMPLETED" } });
  }
}
