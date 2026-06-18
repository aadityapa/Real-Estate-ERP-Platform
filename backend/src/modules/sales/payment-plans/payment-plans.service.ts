import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getPaginationParams } from "@propos/shared-utils";
import { PrismaService } from "../../../database/prisma.service";
import { paginate } from "../../../common/utils/paginate";
import {
  CreatePaymentPlanDto,
  FilterPaymentPlanDto,
} from "./dto/payment-plan.dto";

@Injectable()
export class PaymentPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, filter: FilterPaymentPlanDto) {
    const { skip, take, page, limit } = getPaginationParams(
      filter.page,
      filter.limit,
    );

    const where: Prisma.PaymentPlanWhereInput = {
      project: { company: { tenantId } },
      ...(filter.projectId && { projectId: filter.projectId }),
      isActive: true,
    };

    const [items, total] = await Promise.all([
      this.prisma.paymentPlan.findMany({
        where,
        skip,
        take,
        include: { project: { select: { id: true, name: true } } },
      }),
      this.prisma.paymentPlan.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const plan = await this.prisma.paymentPlan.findFirst({
      where: { id, project: { company: { tenantId } } },
      include: { project: true },
    });
    if (!plan) throw new NotFoundException("Payment plan not found");
    return plan;
  }

  async create(tenantId: string, dto: CreatePaymentPlanDto) {
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, company: { tenantId } },
    });
    if (!project) throw new NotFoundException("Project not found");

    return this.prisma.paymentPlan.create({
      data: {
        projectId: dto.projectId,
        name: dto.name,
        description: dto.description,
        installments: dto.installments as unknown as Prisma.InputJsonValue,
        isActive: dto.isActive ?? true,
      },
      include: { project: { select: { id: true, name: true } } },
    });
  }
}
