import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getPaginationParams } from "@propos/shared-utils";
import { PrismaService } from "../../../database/prisma.service";
import { paginate } from "../../../common/utils/paginate";
import { CreateAssetDto, FilterAssetDto, UpdateAssetDto } from "./dto/asset.dto";

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, filter: FilterAssetDto) {
    const { skip, take, page, limit } = getPaginationParams(filter.page, filter.limit);
    const where: Prisma.AssetWhereInput = {
      tenantId,
      ...(filter.type && { type: filter.type }),
      ...(filter.status && { status: filter.status }),
      ...(filter.search && { name: { contains: filter.search, mode: "insensitive" } }),
    };
    const [items, total] = await Promise.all([
      this.prisma.asset.findMany({ where, skip, take, orderBy: { [filter.sortBy ?? "createdAt"]: filter.order ?? "desc" } }),
      this.prisma.asset.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const asset = await this.prisma.asset.findFirst({ where: { id, tenantId } });
    if (!asset) throw new NotFoundException("Asset not found");
    return asset;
  }

  async create(tenantId: string, dto: CreateAssetDto) {
    return this.prisma.asset.create({
      data: { tenantId, ...dto, purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateAssetDto) {
    await this.findOne(tenantId, id);
    return this.prisma.asset.update({
      where: { id },
      data: { ...dto, nextServiceDate: dto.nextServiceDate ? new Date(dto.nextServiceDate) : undefined },
    });
  }

  async archive(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.asset.update({ where: { id }, data: { status: "DISPOSED" } });
  }
}
