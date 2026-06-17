import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getPaginationParams } from "@propos/shared-utils";
import { PrismaService } from "../../../database/prisma.service";
import { paginate } from "../../../common/utils/paginate";
import { CreateLeaveDto, FilterLeaveDto, UpdateLeaveDto } from "./dto/leave.dto";

@Injectable()
export class LeavesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, filter: FilterLeaveDto) {
    const { skip, take, page, limit } = getPaginationParams(filter.page, filter.limit);
    const where: Prisma.LeaveWhereInput = {
      employee: { company: { tenantId } },
      ...(filter.employeeId && { employeeId: filter.employeeId }),
      ...(filter.status && { status: filter.status }),
    };
    const [items, total] = await Promise.all([
      this.prisma.leave.findMany({
        where, skip, take, orderBy: { [filter.sortBy ?? "createdAt"]: filter.order ?? "desc" },
        include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
      }),
      this.prisma.leave.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const leave = await this.prisma.leave.findFirst({
      where: { id, employee: { company: { tenantId } } },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!leave) throw new NotFoundException("Leave request not found");
    return leave;
  }

  async create(tenantId: string, dto: CreateLeaveDto) {
    const employee = await this.prisma.employee.findFirst({ where: { id: dto.employeeId, company: { tenantId } } });
    if (!employee) throw new NotFoundException("Employee not found");
    return this.prisma.leave.create({
      data: { ...dto, startDate: new Date(dto.startDate), endDate: new Date(dto.endDate) },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateLeaveDto) {
    await this.findOne(tenantId, id);
    return this.prisma.leave.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.leave.delete({ where: { id } });
  }
}
