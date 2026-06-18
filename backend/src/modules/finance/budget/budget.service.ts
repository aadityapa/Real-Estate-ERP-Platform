import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getPaginationParams } from "@propos/shared-utils";
import { PrismaService } from "../../../database/prisma.service";
import { paginate } from "../../../common/utils/paginate";
import { CreateBudgetDto, FilterBudgetDto, UpdateBudgetDto } from "./dto/budget.dto";

@Injectable()
export class BudgetService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, filter: FilterBudgetDto) {
    const { skip, take, page, limit } = getPaginationParams(filter.page, filter.limit);
    const where: Prisma.BudgetWhereInput = {
      project: { company: { tenantId } },
      ...(filter.projectId && { projectId: filter.projectId }),
      ...(filter.year && { year: filter.year }),
    };
    const [items, total] = await Promise.all([
      this.prisma.budget.findMany({
        where, skip, take, orderBy: { [filter.sortBy ?? "createdAt"]: filter.order ?? "desc" },
        include: { project: { select: { id: true, name: true } } },
      }),
      this.prisma.budget.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, project: { company: { tenantId } } },
      include: { project: { select: { id: true, name: true } } },
    });
    if (!budget) throw new NotFoundException("Budget not found");
    return budget;
  }

  async create(tenantId: string, dto: CreateBudgetDto) {
    const project = await this.prisma.project.findFirst({ where: { id: dto.projectId, company: { tenantId } } });
    if (!project) throw new NotFoundException("Project not found");
    return this.prisma.budget.create({ data: dto, include: { project: { select: { id: true, name: true } } } });
  }

  async update(tenantId: string, id: string, dto: UpdateBudgetDto) {
    await this.findOne(tenantId, id);
    return this.prisma.budget.update({ where: { id }, data: dto });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.budget.delete({ where: { id } });
  }
}
