import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getPaginationParams } from "@propos/shared-utils";
import { PrismaService } from "../../../database/prisma.service";
import { paginate } from "../../../common/utils/paginate";
import { CreateDprDto, FilterDprDto, UpdateDprDto } from "./dto/dpr.dto";

@Injectable()
export class DprService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, filter: FilterDprDto) {
    const { skip, take, page, limit } = getPaginationParams(filter.page, filter.limit);
    const where: Prisma.DailyProgressReportWhereInput = {
      project: { company: { tenantId } },
      ...(filter.projectId && { projectId: filter.projectId }),
      ...(filter.status && { status: filter.status }),
    };
    const [items, total] = await Promise.all([
      this.prisma.dailyProgressReport.findMany({
        where, skip, take, orderBy: { [filter.sortBy ?? "createdAt"]: filter.order ?? "desc" },
        include: { project: { select: { id: true, name: true } }, milestone: { select: { id: true, name: true } } },
      }),
      this.prisma.dailyProgressReport.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const dpr = await this.prisma.dailyProgressReport.findFirst({
      where: { id, project: { company: { tenantId } } },
      include: { project: { select: { id: true, name: true } }, milestone: true },
    });
    if (!dpr) throw new NotFoundException("DPR not found");
    return dpr;
  }

  async create(tenantId: string, dto: CreateDprDto) {
    const project = await this.prisma.project.findFirst({ where: { id: dto.projectId, company: { tenantId } } });
    if (!project) throw new NotFoundException("Project not found");
    return this.prisma.dailyProgressReport.create({
      data: {
        projectId: dto.projectId,
        milestoneId: dto.milestoneId,
        reportDate: new Date(dto.reportDate),
        engineerId: dto.engineerId,
        activities: dto.activities as Prisma.InputJsonValue,
        labour: dto.labour as Prisma.InputJsonValue | undefined,
        materials: dto.materials as Prisma.InputJsonValue | undefined,
        weather: dto.weather,
        issues: dto.issues,
        photos: dto.photos ?? [],
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateDprDto) {
    await this.findOne(tenantId, id);
    return this.prisma.dailyProgressReport.update({
      where: { id },
      data: {
        activities: dto.activities as Prisma.InputJsonValue | undefined,
        labour: dto.labour as Prisma.InputJsonValue | undefined,
        materials: dto.materials as Prisma.InputJsonValue | undefined,
        weather: dto.weather,
        issues: dto.issues,
        photos: dto.photos,
        status: dto.status,
        approvedAt: dto.status === "APPROVED" ? new Date() : undefined,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.dailyProgressReport.delete({ where: { id } });
  }
}
