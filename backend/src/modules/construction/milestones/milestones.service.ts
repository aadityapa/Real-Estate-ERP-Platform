import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getPaginationParams } from "@propos/shared-utils";
import { PrismaService } from "../../../database/prisma.service";
import { paginate } from "../../../common/utils/paginate";
import { CreateMilestoneDto, FilterMilestoneDto, UpdateMilestoneDto } from "./dto/milestone.dto";

@Injectable()
export class MilestonesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, filter: FilterMilestoneDto) {
    const { skip, take, page, limit } = getPaginationParams(filter.page, filter.limit);
    const where: Prisma.MilestoneWhereInput = {
      project: { company: { tenantId } },
      ...(filter.projectId && { projectId: filter.projectId }),
      ...(filter.status && { status: filter.status }),
    };
    const [items, total] = await Promise.all([
      this.prisma.milestone.findMany({
        where, skip, take, orderBy: { [filter.sortBy ?? "createdAt"]: filter.order ?? "desc" },
        include: { project: { select: { id: true, name: true, code: true } } },
      }),
      this.prisma.milestone.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const milestone = await this.prisma.milestone.findFirst({
      where: { id, project: { company: { tenantId } } },
      include: { project: { select: { id: true, name: true } } },
    });
    if (!milestone) throw new NotFoundException("Milestone not found");
    return milestone;
  }

  async create(tenantId: string, dto: CreateMilestoneDto) {
    const project = await this.prisma.project.findFirst({ where: { id: dto.projectId, company: { tenantId } } });
    if (!project) throw new NotFoundException("Project not found");
    return this.prisma.milestone.create({
      data: {
        ...dto,
        plannedStart: new Date(dto.plannedStart),
        plannedEnd: new Date(dto.plannedEnd),
        dependencies: dto.dependencies ?? [],
      },
      include: { project: { select: { id: true, name: true } } },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateMilestoneDto) {
    await this.findOne(tenantId, id);
    return this.prisma.milestone.update({
      where: { id },
      data: {
        ...dto,
        plannedStart: dto.plannedStart ? new Date(dto.plannedStart) : undefined,
        plannedEnd: dto.plannedEnd ? new Date(dto.plannedEnd) : undefined,
        actualStart: dto.actualStart ? new Date(dto.actualStart) : undefined,
        actualEnd: dto.actualEnd ? new Date(dto.actualEnd) : undefined,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.milestone.delete({ where: { id } });
  }
}
