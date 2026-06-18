import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getPaginationParams } from "@propos/shared-utils";
import { PrismaService } from "../../database/prisma.service";
import { paginate } from "../../common/utils/paginate";
import { CreateChannelPartnerDto, FilterChannelPartnerDto, UpdateChannelPartnerDto } from "./dto/channel-partner.dto";

@Injectable()
export class ChannelPartnersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, filter: FilterChannelPartnerDto) {
    const { skip, take, page, limit } = getPaginationParams(filter.page, filter.limit);
    const where: Prisma.ChannelPartnerWhereInput = {
      tenantId,
      ...(filter.type && { type: filter.type }),
      ...(filter.status && { status: filter.status }),
      ...(filter.search && {
        OR: [
          { name: { contains: filter.search, mode: "insensitive" } },
          { code: { contains: filter.search, mode: "insensitive" } },
        ],
      }),
    };
    const [items, total] = await Promise.all([
      this.prisma.channelPartner.findMany({ where, skip, take, orderBy: { [filter.sortBy ?? "createdAt"]: filter.order ?? "desc" } }),
      this.prisma.channelPartner.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const partner = await this.prisma.channelPartner.findFirst({ where: { id, tenantId } });
    if (!partner) throw new NotFoundException("Channel partner not found");
    return partner;
  }

  async create(tenantId: string, dto: CreateChannelPartnerDto) {
    return this.prisma.channelPartner.create({ data: { tenantId, ...dto } });
  }

  async update(tenantId: string, id: string, dto: UpdateChannelPartnerDto) {
    await this.findOne(tenantId, id);
    return this.prisma.channelPartner.update({
      where: { id },
      data: { ...dto, address: dto.address as Prisma.InputJsonValue | undefined },
    });
  }

  async archive(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.channelPartner.update({ where: { id }, data: { status: "ARCHIVED" } });
  }
}
