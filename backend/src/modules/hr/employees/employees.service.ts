import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getPaginationParams } from "@propos/shared-utils";
import { PrismaService } from "../../../database/prisma.service";
import { paginate } from "../../../common/utils/paginate";
import { CreateEmployeeDto, FilterEmployeeDto, UpdateEmployeeDto } from "./dto/employee.dto";

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, filter: FilterEmployeeDto) {
    const { skip, take, page, limit } = getPaginationParams(filter.page, filter.limit);
    const where: Prisma.EmployeeWhereInput = {
      company: { tenantId },
      ...(filter.companyId && { companyId: filter.companyId }),
      ...(filter.status && { status: filter.status }),
      ...(filter.search && {
        OR: [
          { firstName: { contains: filter.search, mode: "insensitive" } },
          { lastName: { contains: filter.search, mode: "insensitive" } },
          { employeeCode: { contains: filter.search, mode: "insensitive" } },
        ],
      }),
    };
    const [items, total] = await Promise.all([
      this.prisma.employee.findMany({
        where, skip, take,
        orderBy: { [filter.sortBy ?? "createdAt"]: filter.order ?? "desc" },
        include: { company: { select: { id: true, name: true } } },
      }),
      this.prisma.employee.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, company: { tenantId } },
      include: { company: { select: { id: true, name: true } }, branch: true },
    });
    if (!employee) throw new NotFoundException("Employee not found");
    return employee;
  }

  async create(tenantId: string, dto: CreateEmployeeDto) {
    const company = await this.prisma.company.findFirst({ where: { id: dto.companyId, tenantId } });
    if (!company) throw new NotFoundException("Company not found");
    return this.prisma.employee.create({
      data: { ...dto, dateOfJoining: dto.dateOfJoining ? new Date(dto.dateOfJoining) : undefined },
      include: { company: { select: { id: true, name: true } } },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateEmployeeDto) {
    await this.findOne(tenantId, id);
    return this.prisma.employee.update({
      where: { id },
      data: { ...dto, address: dto.address as Prisma.InputJsonValue | undefined },
      include: { company: { select: { id: true, name: true } } },
    });
  }

  async archive(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.employee.update({ where: { id }, data: { status: "INACTIVE" } });
  }
}
