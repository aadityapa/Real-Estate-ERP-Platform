import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getPaginationParams } from "@propos/shared-utils";
import { PrismaService } from "../../database/prisma.service";
import { paginate } from "../../common/utils/paginate";
import { CreateVendorDto, FilterVendorDto, UpdateVendorDto } from "./dto/vendor.dto";

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, filter: FilterVendorDto) {
    const { skip, take, page, limit } = getPaginationParams(filter.page, filter.limit);
    const where: Prisma.VendorWhereInput = {
      tenantId,
      ...(filter.type && { type: filter.type }),
      ...(filter.status && { status: filter.status }),
      ...(filter.search && { name: { contains: filter.search, mode: "insensitive" } }),
    };
    const [items, total] = await Promise.all([
      this.prisma.vendor.findMany({ where, skip, take, orderBy: { [filter.sortBy ?? "createdAt"]: filter.order ?? "desc" } }),
      this.prisma.vendor.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const vendor = await this.prisma.vendor.findFirst({ where: { id, tenantId } });
    if (!vendor) throw new NotFoundException("Vendor not found");
    return vendor;
  }

  async create(tenantId: string, dto: CreateVendorDto) {
    return this.prisma.vendor.create({
      data: { tenantId, ...dto, address: dto.address as Prisma.InputJsonValue | undefined },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateVendorDto) {
    await this.findOne(tenantId, id);
    return this.prisma.vendor.update({
      where: { id },
      data: { ...dto, address: dto.address as Prisma.InputJsonValue | undefined },
    });
  }

  async archive(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.vendor.update({ where: { id }, data: { status: "ARCHIVED" } });
  }
}
