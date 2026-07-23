import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getPaginationParams } from "@propos/shared-utils";
import { PrismaService } from "../../../database/prisma.service";
import { paginate } from "../../../common/utils/paginate";
import {
  CreateTdsEntryDto,
  FilterTdsEntryDto,
  TdsReturnQueryDto,
  UpdateTdsEntryDto,
} from "./dto/tds.dto";
import {
  computeTdsAmount,
  indianFiscalQuarter,
  indianFiscalYear,
} from "../gst/tax-compute";

@Injectable()
export class TdsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, filter: FilterTdsEntryDto) {
    const { skip, take, page, limit } = getPaginationParams(
      filter.page,
      filter.limit,
    );
    const where: Prisma.TdsEntryWhereInput = {
      tenantId,
      ...(filter.section && { section: filter.section.toUpperCase() }),
      ...(filter.fiscalYear && { fiscalYear: filter.fiscalYear }),
      ...(filter.quarter && { quarter: filter.quarter }),
      ...(filter.status && { status: filter.status }),
    };
    const [items, total] = await Promise.all([
      this.prisma.tdsEntry.findMany({
        where,
        skip,
        take,
        orderBy: { [filter.sortBy ?? "deductDate"]: filter.order ?? "desc" },
      }),
      this.prisma.tdsEntry.count({ where }),
    ]);
    return paginate(items.map(serializeTds), total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const row = await this.prisma.tdsEntry.findFirst({
      where: { id, tenantId },
    });
    if (!row) throw new NotFoundException("TDS entry not found");
    return serializeTds(row);
  }

  async create(tenantId: string, dto: CreateTdsEntryDto) {
    if (dto.vendorId) {
      const vendor = await this.prisma.vendor.findFirst({
        where: { id: dto.vendorId, tenantId },
      });
      if (!vendor) throw new NotFoundException("Vendor not found");
    }
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, tenantId },
      });
      if (!customer) throw new NotFoundException("Customer not found");
    }
    if (dto.gstInvoiceId) {
      const inv = await this.prisma.gSTInvoice.findFirst({
        where: { id: dto.gstInvoiceId, tenantId },
      });
      if (!inv) throw new NotFoundException("GST invoice not found");
    }

    const paymentAmountPaise = BigInt(dto.paymentAmountPaise);
    const { tdsAmountPaise, netPayablePaise } = computeTdsAmount(
      paymentAmountPaise,
      dto.tdsRateBps,
    );
    const deductDate = new Date(dto.deductDate);
    const fiscalYear = indianFiscalYear(deductDate);
    const quarter = indianFiscalQuarter(deductDate);

    const created = await this.prisma.tdsEntry.create({
      data: {
        tenantId,
        section: dto.section.toUpperCase(),
        deducteeType: dto.deducteeType.toUpperCase(),
        deducteeName: dto.deducteeName,
        deducteePanLast4: dto.deducteePanLast4?.toUpperCase(),
        vendorId: dto.vendorId,
        customerId: dto.customerId,
        vendorPaymentId: dto.vendorPaymentId,
        paymentId: dto.paymentId,
        gstInvoiceId: dto.gstInvoiceId,
        paymentAmountPaise,
        tdsRateBps: dto.tdsRateBps,
        tdsAmountPaise,
        netPayablePaise,
        deductDate,
        challanNumber: dto.challanNumber,
        challanDate: dto.challanDate ? new Date(dto.challanDate) : undefined,
        quarter,
        fiscalYear,
        status: dto.challanNumber ? "DEPOSITED" : "ACCRUED",
      },
    });
    return serializeTds(created);
  }

  async update(tenantId: string, id: string, dto: UpdateTdsEntryDto) {
    await this.findOne(tenantId, id);
    if (dto.status === "DEPOSITED" && !dto.challanNumber) {
      const existing = await this.prisma.tdsEntry.findFirst({
        where: { id, tenantId },
      });
      if (!existing?.challanNumber && !dto.challanNumber) {
        throw new BadRequestException(
          "challanNumber required when marking DEPOSITED",
        );
      }
    }
    const updated = await this.prisma.tdsEntry.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.challanNumber !== undefined && {
          challanNumber: dto.challanNumber,
        }),
        ...(dto.challanDate && { challanDate: new Date(dto.challanDate) }),
      },
    });
    return serializeTds(updated);
  }

  /** Aggregated TDS return worksheet for a quarter (26Q / 27Q style). */
  async exportReturn(tenantId: string, query: TdsReturnQueryDto) {
    const rows = await this.prisma.tdsEntry.findMany({
      where: {
        tenantId,
        fiscalYear: query.fiscalYear,
        quarter: query.quarter,
      },
      orderBy: [{ section: "asc" }, { deductDate: "asc" }],
    });

    const bySection = new Map<
      string,
      {
        section: string;
        count: number;
        paymentAmountPaise: bigint;
        tdsAmountPaise: bigint;
      }
    >();
    for (const r of rows) {
      const cur = bySection.get(r.section) ?? {
        section: r.section,
        count: 0,
        paymentAmountPaise: 0n,
        tdsAmountPaise: 0n,
      };
      cur.count += 1;
      cur.paymentAmountPaise += r.paymentAmountPaise;
      cur.tdsAmountPaise += r.tdsAmountPaise;
      bySection.set(r.section, cur);
    }

    return {
      fiscalYear: query.fiscalYear,
      quarter: query.quarter,
      generatedAt: new Date().toISOString(),
      count: rows.length,
      paymentAmountPaise: rows
        .reduce((a, r) => a + r.paymentAmountPaise, 0n)
        .toString(),
      tdsAmountPaise: rows
        .reduce((a, r) => a + r.tdsAmountPaise, 0n)
        .toString(),
      bySection: [...bySection.values()].map((s) => ({
        section: s.section,
        count: s.count,
        paymentAmountPaise: s.paymentAmountPaise.toString(),
        tdsAmountPaise: s.tdsAmountPaise.toString(),
      })),
      rows: rows.map(serializeTds),
    };
  }
}

function serializeTds(row: {
  id: string;
  tenantId: string;
  section: string;
  deducteeType: string;
  deducteeName: string;
  deducteePanLast4: string | null;
  vendorId: string | null;
  customerId: string | null;
  vendorPaymentId: string | null;
  paymentId: string | null;
  gstInvoiceId: string | null;
  paymentAmountPaise: bigint;
  tdsRateBps: number;
  tdsAmountPaise: bigint;
  netPayablePaise: bigint;
  deductDate: Date;
  challanNumber: string | null;
  challanDate: Date | null;
  quarter: string;
  fiscalYear: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    section: row.section,
    deducteeType: row.deducteeType,
    deducteeName: row.deducteeName,
    deducteePanLast4: row.deducteePanLast4,
    vendorId: row.vendorId,
    customerId: row.customerId,
    vendorPaymentId: row.vendorPaymentId,
    paymentId: row.paymentId,
    gstInvoiceId: row.gstInvoiceId,
    paymentAmountPaise: row.paymentAmountPaise.toString(),
    tdsRateBps: row.tdsRateBps,
    tdsAmountPaise: row.tdsAmountPaise.toString(),
    netPayablePaise: row.netPayablePaise.toString(),
    deductDate: row.deductDate,
    challanNumber: row.challanNumber,
    challanDate: row.challanDate,
    quarter: row.quarter,
    fiscalYear: row.fiscalYear,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
