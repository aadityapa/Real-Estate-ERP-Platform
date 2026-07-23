import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getPaginationParams } from "@propos/shared-utils";
import { PrismaService } from "../../../database/prisma.service";
import { paginate } from "../../../common/utils/paginate";
import { CreateCustomerDto, FilterCustomerDto, UpdateCustomerDto } from "./dto/customer.dto";

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, filter: FilterCustomerDto) {
    const { skip, take, page, limit } = getPaginationParams(filter.page, filter.limit);
    const where: Prisma.CustomerWhereInput = {
      tenantId,
      ...(filter.search && {
        OR: [
          { firstName: { contains: filter.search, mode: "insensitive" } },
          { lastName: { contains: filter.search, mode: "insensitive" } },
          { phone: { contains: filter.search } },
        ],
      }),
    };
    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where, skip, take,
        orderBy: { [filter.sortBy ?? "createdAt"]: filter.order ?? "desc" },
        include: { _count: { select: { bookings: true, tickets: true } } },
      }),
      this.prisma.customer.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
      include: { bookings: { include: { lead: { select: { id: true, tenantId: true } } } } },
    });
    if (!customer) throw new NotFoundException("Customer not found");
    return customer;
  }

  async create(tenantId: string, dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        tenantId,
        ...dto,
        address: dto.address as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateCustomerDto) {
    await this.findOne(tenantId, id);
    return this.prisma.customer.update({
      where: { id },
      data: { ...dto, address: dto.address as Prisma.InputJsonValue | undefined },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.customer.delete({ where: { id } });
  }

  async getTickets(tenantId: string, customerId: string) {
    await this.findOne(tenantId, customerId);
    return this.prisma.supportTicket.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
    });
  }
}
