import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getPaginationParams } from "@propos/shared-utils";
import { CacheService } from "../../../common/redis/cache.service";
import { PrismaService } from "../../../database/prisma.service";
import { paginate } from "../../../common/utils/paginate";
import { CreateUnitDto, FilterUnitDto, UpdateUnitDto } from "./dto/unit.dto";

const projectTenant = (tenantId: string): Prisma.ProjectWhereInput => ({
  company: { tenantId },
});

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async findAll(tenantId: string, filter: FilterUnitDto) {
    const { skip, take, page, limit } = getPaginationParams(
      filter.page,
      filter.limit,
    );

    const where: Prisma.UnitWhereInput = {
      project: projectTenant(tenantId),
      ...(filter.projectId && { projectId: filter.projectId }),
      ...(filter.status && { status: filter.status }),
      ...(filter.search && {
        unitNumber: { contains: filter.search, mode: "insensitive" },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.unit.findMany({
        where,
        skip,
        take,
        orderBy: { [filter.sortBy ?? "createdAt"]: filter.order ?? "desc" },
        include: {
          project: { select: { id: true, name: true, code: true } },
          tower: { select: { id: true, name: true } },
        },
      }),
      this.prisma.unit.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  /**
   * Availability KPI — cached; busted on unit/booking status changes.
   */
  async getAvailability(tenantId: string, projectId?: string) {
    const key = await this.cache.buildKey(tenantId, "inventory", [
      "availability",
      projectId ?? "all",
    ]);
    return this.cache.getOrSet(key, async () => {
      const base = {
        project: {
          company: { tenantId },
          ...(projectId && { id: projectId }),
        },
      };
      const [available, reserved, booked, blocked, total] = await Promise.all([
        this.prisma.unit.count({ where: { ...base, status: "AVAILABLE" } }),
        this.prisma.unit.count({ where: { ...base, status: "RESERVED" } }),
        this.prisma.unit.count({ where: { ...base, status: "BOOKED" } }),
        this.prisma.unit.count({ where: { ...base, status: "BLOCKED" } }),
        this.prisma.unit.count({ where: base }),
      ]);
      return { available, reserved, booked, blocked, total };
    });
  }

  async findOne(tenantId: string, id: string) {
    const unit = await this.prisma.unit.findFirst({
      where: { id, project: projectTenant(tenantId) },
      include: {
        project: { select: { id: true, name: true, code: true } },
        tower: true,
        building: true,
      },
    });

    if (!unit) throw new NotFoundException("Unit not found");
    return unit;
  }

  async create(tenantId: string, dto: CreateUnitDto) {
    await this.assertProject(tenantId, dto.projectId);

    const unit = await this.prisma.unit.create({
      data: {
        ...dto,
        premiums: dto.premiums as Prisma.InputJsonValue | undefined,
      },
      include: { project: { select: { id: true, name: true, code: true } } },
    });
    await this.cache.invalidate(tenantId, "inventory", "lms");
    return unit;
  }

  async update(tenantId: string, id: string, dto: UpdateUnitDto) {
    await this.findOne(tenantId, id);

    const unit = await this.prisma.unit.update({
      where: { id },
      data: dto,
      include: { project: { select: { id: true, name: true, code: true } } },
    });
    await this.cache.invalidate(tenantId, "inventory", "lms");
    return unit;
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    const unit = await this.prisma.unit.update({
      where: { id },
      data: { status: "BLOCKED" },
    });
    await this.cache.invalidate(tenantId, "inventory", "lms");
    return unit;
  }

  private async assertProject(tenantId: string, projectId: string): Promise<void> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, company: { tenantId } },
    });
    if (!project) throw new NotFoundException("Project not found");
  }
}
