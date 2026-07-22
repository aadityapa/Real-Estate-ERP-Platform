import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getPaginationParams } from "@propos/shared-utils";
import { PrismaService } from "../../../database/prisma.service";
import { paginate } from "../../../common/utils/paginate";
import { CreateAttendanceDto, FilterAttendanceDto, UpdateAttendanceDto } from "./dto/attendance.dto";

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, filter: FilterAttendanceDto) {
    const { skip, take, page, limit } = getPaginationParams(filter.page, filter.limit);
    const where: Prisma.AttendanceWhereInput = {
      employee: { company: { tenantId } },
      ...(filter.employeeId && { employeeId: filter.employeeId }),
      ...(filter.status && { status: filter.status }),
    };
    const [items, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where, skip, take, orderBy: { date: "desc" },
        include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
      }),
      this.prisma.attendance.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const record = await this.prisma.attendance.findFirst({
      where: { id, employee: { company: { tenantId } } },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!record) throw new NotFoundException("Attendance not found");
    return record;
  }

  async create(tenantId: string, dto: CreateAttendanceDto) {
    const employee = await this.prisma.employee.findFirst({ where: { id: dto.employeeId, company: { tenantId } } });
    if (!employee) throw new NotFoundException("Employee not found");
    return this.prisma.attendance.create({
      data: {
        employeeId: dto.employeeId,
        date: new Date(dto.date),
        checkIn: dto.checkIn ? new Date(dto.checkIn) : undefined,
        checkOut: dto.checkOut ? new Date(dto.checkOut) : undefined,
        status: dto.status,
        notes: dto.notes,
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateAttendanceDto) {
    await this.findOne(tenantId, id);
    return this.prisma.attendance.update({
      where: { id },
      data: {
        ...dto,
        checkIn: dto.checkIn ? new Date(dto.checkIn) : undefined,
        checkOut: dto.checkOut ? new Date(dto.checkOut) : undefined,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.attendance.delete({ where: { id } });
  }
}
