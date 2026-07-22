import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getPaginationParams } from "@propos/shared-utils";
import { PrismaService } from "../../../database/prisma.service";
import { paginate } from "../../../common/utils/paginate";
import { CreateLedgerEntryDto, FilterLedgerDto, UpdateLedgerEntryDto } from "./dto/ledger.dto";

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, filter: FilterLedgerDto) {
    const { skip, take, page, limit } = getPaginationParams(filter.page, filter.limit);
    const where: Prisma.LedgerEntryWhereInput = {
      tenantId,
      ...(filter.projectId && { projectId: filter.projectId }),
      ...(filter.entryType && { entryType: filter.entryType }),
    };
    const [items, total] = await Promise.all([
      this.prisma.ledgerEntry.findMany({
        where, skip, take, orderBy: { [filter.sortBy ?? "createdAt"]: filter.order ?? "desc" },
      }),
      this.prisma.ledgerEntry.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const entry = await this.prisma.ledgerEntry.findFirst({ where: { id, tenantId } });
    if (!entry) throw new NotFoundException("Ledger entry not found");
    return entry;
  }

  async create(tenantId: string, dto: CreateLedgerEntryDto) {
    if (dto.projectId) {
      const project = await this.prisma.project.findFirst({ where: { id: dto.projectId, company: { tenantId } } });
      if (!project) throw new NotFoundException("Project not found");
    }
    return this.prisma.ledgerEntry.create({
      data: { tenantId, ...dto, entryDate: new Date(dto.entryDate) },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateLedgerEntryDto) {
    await this.findOne(tenantId, id);
    return this.prisma.ledgerEntry.update({
      where: { id },
      data: { ...dto, entryDate: dto.entryDate ? new Date(dto.entryDate) : undefined },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.ledgerEntry.delete({ where: { id } });
  }
}