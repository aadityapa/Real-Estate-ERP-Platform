import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getPaginationParams } from "@propos/shared-utils";
import { PrismaService } from "../../../database/prisma.service";
import { paginate } from "../../../common/utils/paginate";
import {
  CreateCompanyDto,
  FilterCompanyDto,
  UpdateCompanyDto,
} from "./dto/company.dto";

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, filter: FilterCompanyDto) {
    const { skip, take, page, limit } = getPaginationParams(
      filter.page,
      filter.limit,
    );

    const where: Prisma.CompanyWhereInput = {
      tenantId,
      ...(filter.status && { status: filter.status }),
      ...(filter.search && {
        name: { contains: filter.search, mode: "insensitive" },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip,
        take,
        orderBy: { [filter.sortBy ?? "createdAt"]: filter.order ?? "desc" },
      }),
      this.prisma.company.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const company = await this.prisma.company.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { projects: true, employees: true } } },
    });

    if (!company) throw new NotFoundException("Company not found");
    return company;
  }

  async create(tenantId: string, dto: CreateCompanyDto) {
    return this.prisma.company.create({
      data: {
        tenantId,
        ...dto,
        address: dto.address as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateCompanyDto) {
    await this.findOne(tenantId, id);

    return this.prisma.company.update({
      where: { id },
      data: {
        ...dto,
        address: dto.address as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async archive(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.company.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });
  }
}
