import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { getPaginationParams } from "@propos/shared-utils";
import { PrismaService } from "../../../database/prisma.service";
import { paginate } from "../../../common/utils/paginate";
import { CreateUserDto, FilterUserDto } from "./dto/user.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
  async findAll(tenantId: string, filter: FilterUserDto) {
    const { skip, take, page, limit } = getPaginationParams(filter.page, filter.limit);
    const where: Prisma.UserWhereInput = { tenantId, ...(filter.status && { status: filter.status }), ...(filter.search && { OR: [{ firstName: { contains: filter.search, mode: "insensitive" } }, { lastName: { contains: filter.search, mode: "insensitive" } }, { email: { contains: filter.search, mode: "insensitive" } }] }) };
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({ where, skip, take, orderBy: { [filter.sortBy ?? "createdAt"]: filter.order ?? "desc" }, select: { id: true, email: true, firstName: true, lastName: true, phone: true, status: true, createdAt: true } }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }
  async findOne(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, tenantId }, select: { id: true, email: true, firstName: true, lastName: true, phone: true, status: true, createdAt: true } });
    if (!user) throw new NotFoundException("User not found");
    return user;
  }
  async create(tenantId: string, dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    return this.prisma.user.create({ data: { tenantId, email: dto.email, passwordHash, firstName: dto.firstName, lastName: dto.lastName, phone: dto.phone }, select: { id: true, email: true, firstName: true, lastName: true, status: true } });
  }
  async archive(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.user.update({ where: { id }, data: { status: "INACTIVE" }, select: { id: true, status: true } });
  }
}
