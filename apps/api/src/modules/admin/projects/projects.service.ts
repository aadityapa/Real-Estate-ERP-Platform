import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getPaginationParams } from "@propos/shared-utils";
import { PrismaService } from "../../../database/prisma.service";
import { paginate } from "../../../common/utils/paginate";
import { CreateProjectDto, FilterProjectDto, UpdateProjectDto } from "./dto/project.dto";

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, filter: FilterProjectDto) {
    const { skip, take, page, limit } = getPaginationParams(filter.page, filter.limit);
    const where: Prisma.ProjectWhereInput = {
      company: { tenantId },
      ...(filter.companyId && { companyId: filter.companyId }),
      ...(filter.status && { status: filter.status }),
      ...(filter.search && { OR: [{ name: { contains: filter.search, mode: "insensitive" } }, { code: { contains: filter.search, mode: "insensitive" } }] }),
    };
    const [items, total] = await Promise.all([
      this.prisma.project.findMany({ where, skip, take, orderBy: { [filter.sortBy ?? "createdAt"]: filter.order ?? "desc" }, include: { company: { select: { id: true, name: true } } } }),
      this.prisma.project.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const project = await this.prisma.project.findFirst({ where: { id, company: { tenantId } }, include: { company: { select: { id: true, name: true } } } });
    if (!project) throw new NotFoundException("Project not found");
    return project;
  }

  async create(tenantId: string, dto: CreateProjectDto) {
    const company = await this.prisma.company.findFirst({ where: { id: dto.companyId, tenantId } });
    if (!company) throw new NotFoundException("Company not found");
    return this.prisma.project.create({
      data: { ...dto, location: dto.location as Prisma.InputJsonValue | undefined, startDate: dto.startDate ? new Date(dto.startDate) : undefined, expectedEnd: dto.expectedEnd ? new Date(dto.expectedEnd) : undefined },
      include: { company: { select: { id: true, name: true } } },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateProjectDto) {
    await this.findOne(tenantId, id);
    return this.prisma.project.update({
      where: { id },
      data: { ...dto, location: dto.location as Prisma.InputJsonValue | undefined, startDate: dto.startDate ? new Date(dto.startDate) : undefined, expectedEnd: dto.expectedEnd ? new Date(dto.expectedEnd) : undefined },
      include: { company: { select: { id: true, name: true } } },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.project.update({ where: { id }, data: { status: "ON_HOLD" } });
  }
}
