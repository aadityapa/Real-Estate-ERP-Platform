import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getPaginationParams } from "@propos/shared-utils";
import { PrismaService } from "../../../database/prisma.service";
import { paginate } from "../../../common/utils/paginate";
import { CreateDocumentDto, FilterDocumentDto, UpdateDocumentDto } from "./dto/document.dto";

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, filter: FilterDocumentDto) {
    const { skip, take, page, limit } = getPaginationParams(filter.page, filter.limit);
    const where: Prisma.DocumentWhereInput = {
      tenantId,
      ...(filter.projectId && { projectId: filter.projectId }),
      ...(filter.category && { category: filter.category }),
      ...(filter.search && { name: { contains: filter.search, mode: "insensitive" } }),
    };
    const [items, total] = await Promise.all([
      this.prisma.document.findMany({ where, skip, take, orderBy: { [filter.sortBy ?? "createdAt"]: filter.order ?? "desc" } }),
      this.prisma.document.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const doc = await this.prisma.document.findFirst({ where: { id, tenantId } });
    if (!doc) throw new NotFoundException("Document not found");
    return doc;
  }

  async create(tenantId: string, dto: CreateDocumentDto) {
    return this.prisma.document.create({
      data: { tenantId, ...dto, tags: dto.tags ?? [], expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateDocumentDto) {
    await this.findOne(tenantId, id);
    return this.prisma.document.update({
      where: { id },
      data: { ...dto, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.document.delete({ where: { id } });
  }
}
