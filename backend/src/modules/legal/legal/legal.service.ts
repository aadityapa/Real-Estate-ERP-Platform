import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getPaginationParams } from "@propos/shared-utils";
import { PrismaService } from "../../../database/prisma.service";
import { paginate } from "../../../common/utils/paginate";
import { CreateLegalCaseDto, FilterLegalCaseDto, UpdateLegalCaseDto } from "./dto/legal-case.dto";

@Injectable()
export class LegalService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, filter: FilterLegalCaseDto) {
    const { skip, take, page, limit } = getPaginationParams(filter.page, filter.limit);
    const where: Prisma.LegalCaseWhereInput = {
      tenantId,
      ...(filter.projectId && { projectId: filter.projectId }),
      ...(filter.status && { status: filter.status }),
      ...(filter.search && { title: { contains: filter.search, mode: "insensitive" } }),
    };
    const [items, total] = await Promise.all([
      this.prisma.legalCase.findMany({ where, skip, take, orderBy: { [filter.sortBy ?? "createdAt"]: filter.order ?? "desc" } }),
      this.prisma.legalCase.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const legalCase = await this.prisma.legalCase.findFirst({ where: { id, tenantId } });
    if (!legalCase) throw new NotFoundException("Legal case not found");
    return legalCase;
  }

  async create(tenantId: string, dto: CreateLegalCaseDto) {
    return this.prisma.legalCase.create({
      data: {
        tenantId,
        ...dto,
        parties: dto.parties as Prisma.InputJsonValue | undefined,
        filedDate: dto.filedDate ? new Date(dto.filedDate) : undefined,
        hearingDate: dto.hearingDate ? new Date(dto.hearingDate) : undefined,
        documents: [],
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateLegalCaseDto) {
    await this.findOne(tenantId, id);
    return this.prisma.legalCase.update({
      where: { id },
      data: {
        ...dto,
        parties: dto.parties as Prisma.InputJsonValue | undefined,
        hearingDate: dto.hearingDate ? new Date(dto.hearingDate) : undefined,
      },
    });
  }

  async archive(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.legalCase.update({ where: { id }, data: { status: "CLOSED" } });
  }
}
