import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getPaginationParams } from "@propos/shared-utils";
import { PrismaService } from "../../../database/prisma.service";
import { paginate } from "../../../common/utils/paginate";
import { CreatePurchaseOrderDto, FilterPurchaseOrderDto, UpdatePurchaseOrderDto } from "./dto/purchase-order.dto";

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, filter: FilterPurchaseOrderDto) {
    const { skip, take, page, limit } = getPaginationParams(filter.page, filter.limit);
    const where: Prisma.PurchaseOrderWhereInput = {
      vendor: { tenantId },
      project: { company: { tenantId } },
      ...(filter.vendorId && { vendorId: filter.vendorId }),
      ...(filter.projectId && { projectId: filter.projectId }),
      ...(filter.status && { status: filter.status }),
    };
    const [items, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where, skip, take, orderBy: { [filter.sortBy ?? "createdAt"]: filter.order ?? "desc" },
        include: { vendor: { select: { id: true, name: true } }, project: { select: { id: true, name: true } } },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, vendor: { tenantId } },
      include: { vendor: true, project: { select: { id: true, name: true } } },
    });
    if (!po) throw new NotFoundException("Purchase order not found");
    return po;
  }

  async create(tenantId: string, dto: CreatePurchaseOrderDto) {
    const vendor = await this.prisma.vendor.findFirst({ where: { id: dto.vendorId, tenantId } });
    if (!vendor) throw new NotFoundException("Vendor not found");
    const project = await this.prisma.project.findFirst({ where: { id: dto.projectId, company: { tenantId } } });
    if (!project) throw new NotFoundException("Project not found");
    return this.prisma.purchaseOrder.create({
      data: {
        poNumber: `PO-${Date.now()}`,
        ...dto,
        items: dto.items as Prisma.InputJsonValue,
        deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : undefined,
      },
      include: { vendor: { select: { id: true, name: true } }, project: { select: { id: true, name: true } } },
    });
  }

  async update(tenantId: string, id: string, dto: UpdatePurchaseOrderDto) {
    await this.findOne(tenantId, id);
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...dto,
        items: dto.items as Prisma.InputJsonValue | undefined,
        deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : undefined,
        approvedAt: dto.status === "APPROVED" ? new Date() : undefined,
      },
    });
  }

  async cancel(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.purchaseOrder.update({ where: { id }, data: { status: "CANCELLED" } });
  }
}
