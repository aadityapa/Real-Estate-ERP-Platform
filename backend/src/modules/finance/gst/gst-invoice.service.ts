import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getPaginationParams } from "@propos/shared-utils";
import { PrismaService } from "../../../database/prisma.service";
import { paginate } from "../../../common/utils/paginate";
import {
  CancelEInvoiceDto,
  CreateGstInvoiceDto,
  FilterGstInvoiceDto,
  GstrExportQueryDto,
  InvoiceTypeDto,
} from "./dto/gst-invoice.dto";
import {
  GST_IRP_PROVIDER,
  type GstIrpProvider,
} from "./irp/irp.interface";
import {
  computeInvoiceGst,
  indianFiscalYear,
  normalizeStateCode,
  SAAS_GST_RATE_BPS,
  SAAS_SAC,
  stateCodeFromGstin,
  taxableFromGrossInclusive,
} from "./tax-compute";

type StoredLine = {
  description: string;
  hsnSac: string;
  quantity: number;
  unitPricePaise: string;
  taxablePaise: string;
  gstRateBps: number;
  cgstPaise: string;
  sgstPaise: string;
  igstPaise: string;
};

@Injectable()
export class GstInvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(GST_IRP_PROVIDER) private readonly irp: GstIrpProvider,
  ) {}

  async findAll(tenantId: string, filter: FilterGstInvoiceDto) {
    const { skip, take, page, limit } = getPaginationParams(
      filter.page,
      filter.limit,
    );
    const where: Prisma.GSTInvoiceWhereInput = {
      tenantId,
      ...(filter.status && { status: filter.status }),
      ...(filter.type && { type: filter.type }),
      ...(filter.fiscalYear && { fiscalYear: filter.fiscalYear }),
      ...(filter.fromDate || filter.toDate
        ? {
            invoiceDate: {
              ...(filter.fromDate && { gte: new Date(filter.fromDate) }),
              ...(filter.toDate && { lte: new Date(filter.toDate) }),
            },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.gSTInvoice.findMany({
        where,
        skip,
        take,
        orderBy: { [filter.sortBy ?? "invoiceDate"]: filter.order ?? "desc" },
      }),
      this.prisma.gSTInvoice.count({ where }),
    ]);
    return paginate(items.map(serializeGstInvoice), total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const inv = await this.prisma.gSTInvoice.findFirst({
      where: { id, tenantId },
    });
    if (!inv) throw new NotFoundException("GST invoice not found");
    return serializeGstInvoice(inv);
  }

  async create(tenantId: string, dto: CreateGstInvoiceDto) {
    if (dto.companyId) {
      const company = await this.prisma.company.findFirst({
        where: { id: dto.companyId, tenantId },
      });
      if (!company) throw new NotFoundException("Company not found");
    }
    if (dto.saasInvoiceId) {
      const saas = await this.prisma.saasInvoice.findFirst({
        where: { id: dto.saasInvoiceId, tenantId },
      });
      if (!saas) throw new NotFoundException("SaaS invoice not found");
    }
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, tenantId },
      });
      if (!customer) throw new NotFoundException("Customer not found");
    }
    if (dto.vendorId) {
      const vendor = await this.prisma.vendor.findFirst({
        where: { id: dto.vendorId, tenantId },
      });
      if (!vendor) throw new NotFoundException("Vendor not found");
    }

    const supplierState = normalizeStateCode(
      dto.supplierStateCode ?? stateCodeFromGstin(dto.supplierGstin),
    );
    const buyerState = normalizeStateCode(dto.buyerStateCode);
    const placeOfSupply = normalizeStateCode(
      dto.placeOfSupply ?? dto.buyerStateCode,
    );

    const computed = computeInvoiceGst({
      lines: dto.items.map((i) => ({
        taxablePaise: BigInt(i.taxablePaise),
        gstRateBps: i.gstRateBps,
      })),
      supplierStateCode: supplierState,
      placeOfSupply,
    });

    const storedItems: StoredLine[] = dto.items.map((item, idx) => {
      const line = computed.lines[idx]!;
      return {
        description: item.description,
        hsnSac: item.hsnSac,
        quantity: item.quantity,
        unitPricePaise: String(item.unitPricePaise),
        taxablePaise: line.taxablePaise.toString(),
        gstRateBps: item.gstRateBps,
        cgstPaise: line.cgstPaise.toString(),
        sgstPaise: line.sgstPaise.toString(),
        igstPaise: line.igstPaise.toString(),
      };
    });

    const invoiceDate = new Date(dto.invoiceDate);
    const fiscalYear = indianFiscalYear(invoiceDate);
    const seriesPrefix = (dto.seriesPrefix ?? "INV").toUpperCase();
    const invoiceNumber = await this.nextInvoiceNumber(
      tenantId,
      seriesPrefix,
      fiscalYear,
    );

    const created = await this.prisma.gSTInvoice.create({
      data: {
        tenantId,
        companyId: dto.companyId,
        invoiceNumber,
        type: dto.type,
        status: "DRAFT",
        items: storedItems as unknown as Prisma.InputJsonValue,
        supplierGstin: dto.supplierGstin.toUpperCase(),
        supplierStateCode: supplierState,
        buyerGstin: dto.buyerGstin?.toUpperCase(),
        buyerStateCode: buyerState,
        buyerName: dto.buyerName,
        placeOfSupply,
        customerId: dto.customerId,
        vendorId: dto.vendorId,
        saasInvoiceId: dto.saasInvoiceId,
        receiptId: dto.receiptId,
        taxablePaise: computed.taxablePaise,
        cgstPaise: computed.cgstPaise,
        sgstPaise: computed.sgstPaise,
        igstPaise: computed.igstPaise,
        totalGstPaise: computed.totalGstPaise,
        totalPaise: computed.totalPaise,
        invoiceDate,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        fiscalYear,
        seriesPrefix,
        eInvoiceStatus: dto.requestEInvoice ? "PENDING" : "NOT_APPLICABLE",
      },
    });

    if (dto.requestEInvoice) {
      return this.generateEInvoice(tenantId, created.id);
    }
    return serializeGstInvoice(created);
  }

  /**
   * Create a GST tax invoice linked to a paid SaaS subscription invoice.
   * Gross amountPaise is treated as GST-inclusive at SAAS_GST_RATE_BPS.
   */
  async createFromSaasInvoice(args: {
    tenantId: string;
    saasInvoiceId: string;
    saasInvoiceNumber: string;
    amountPaise: bigint;
    supplierGstin: string;
    supplierStateCode?: string;
    buyerGstin?: string | null;
    buyerStateCode: string;
    buyerName?: string;
    companyId?: string;
    requestEInvoice?: boolean;
  }) {
    const existing = await this.prisma.gSTInvoice.findFirst({
      where: { tenantId: args.tenantId, saasInvoiceId: args.saasInvoiceId },
    });
    if (existing) return serializeGstInvoice(existing);

    const taxable = taxableFromGrossInclusive(
      args.amountPaise,
      SAAS_GST_RATE_BPS,
    );
    return this.create(args.tenantId, {
      companyId: args.companyId,
      type: InvoiceTypeDto.SALES,
      supplierGstin: args.supplierGstin,
      supplierStateCode: args.supplierStateCode,
      buyerGstin: args.buyerGstin ?? undefined,
      buyerStateCode: args.buyerStateCode,
      buyerName: args.buyerName,
      placeOfSupply: args.buyerStateCode,
      saasInvoiceId: args.saasInvoiceId,
      items: [
        {
          description: `PropOS subscription (${args.saasInvoiceNumber})`,
          hsnSac: SAAS_SAC,
          quantity: 1,
          unitPricePaise: Number(taxable),
          taxablePaise: Number(taxable),
          gstRateBps: SAAS_GST_RATE_BPS,
        },
      ],
      invoiceDate: new Date().toISOString(),
      seriesPrefix: "SAAS",
      requestEInvoice: args.requestEInvoice ?? false,
    });
  }

  async generateEInvoice(tenantId: string, id: string) {
    const inv = await this.prisma.gSTInvoice.findFirst({
      where: { id, tenantId },
    });
    if (!inv) throw new NotFoundException("GST invoice not found");
    if (inv.irn) {
      return serializeGstInvoice(inv);
    }
    if (inv.status === "CANCELLED") {
      throw new BadRequestException("Cannot e-invoice a cancelled invoice");
    }

    const items = (inv.items as StoredLine[]) ?? [];
    try {
      const result = await this.irp.generateIrn({
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate.toISOString().slice(0, 10),
        supplierGstin: inv.supplierGstin,
        buyerGstin: inv.buyerGstin,
        buyerName: inv.buyerName,
        placeOfSupply: inv.placeOfSupply,
        taxablePaise: inv.taxablePaise.toString(),
        cgstPaise: inv.cgstPaise.toString(),
        sgstPaise: inv.sgstPaise.toString(),
        igstPaise: inv.igstPaise.toString(),
        totalPaise: inv.totalPaise.toString(),
        items,
      });

      const updated = await this.prisma.gSTInvoice.update({
        where: { id: inv.id },
        data: {
          irn: result.irn,
          irnAckNo: result.ackNo,
          irnAckDate: result.ackDate,
          signedQr: result.signedQr,
          eInvoiceStatus: "GENERATED",
          eInvoiceProvider: result.provider,
          eInvoiceError: null,
          status: inv.status === "DRAFT" ? "SENT" : inv.status,
        },
      });
      return serializeGstInvoice(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : "IRP failed";
      const updated = await this.prisma.gSTInvoice.update({
        where: { id: inv.id },
        data: {
          eInvoiceStatus: "FAILED",
          eInvoiceProvider: this.irp.provider,
          eInvoiceError: message.slice(0, 500),
        },
      });
      return serializeGstInvoice(updated);
    }
  }

  async cancelEInvoice(
    tenantId: string,
    id: string,
    dto: CancelEInvoiceDto,
  ) {
    const inv = await this.prisma.gSTInvoice.findFirst({
      where: { id, tenantId },
    });
    if (!inv) throw new NotFoundException("GST invoice not found");
    if (!inv.irn) {
      throw new BadRequestException("Invoice has no IRN to cancel");
    }
    await this.irp.cancelIrn({ irn: inv.irn, reason: dto.reason });
    const updated = await this.prisma.gSTInvoice.update({
      where: { id: inv.id },
      data: {
        eInvoiceStatus: "CANCELLED",
        status: "CANCELLED",
      },
    });
    return serializeGstInvoice(updated);
  }

  /** GSTR-1 style sales register (B2B / B2C rows) for a period. */
  async exportSalesRegister(tenantId: string, query: GstrExportQueryDto) {
    const where: Prisma.GSTInvoiceWhereInput = {
      tenantId,
      type: "SALES",
      status: { not: "CANCELLED" },
      fiscalYear: query.fiscalYear,
    };

    if (query.fromDate || query.toDate) {
      where.invoiceDate = {
        ...(query.fromDate && { gte: new Date(query.fromDate) }),
        ...(query.toDate && { lte: new Date(query.toDate) }),
      };
    } else if (query.quarter) {
      const range = quarterDateRange(query.fiscalYear, query.quarter);
      where.invoiceDate = { gte: range.from, lte: range.to };
    }

    const rows = await this.prisma.gSTInvoice.findMany({
      where,
      orderBy: { invoiceDate: "asc" },
    });

    return {
      fiscalYear: query.fiscalYear,
      quarter: query.quarter ?? null,
      generatedAt: new Date().toISOString(),
      count: rows.length,
      taxablePaise: sumBig(rows.map((r) => r.taxablePaise)).toString(),
      cgstPaise: sumBig(rows.map((r) => r.cgstPaise)).toString(),
      sgstPaise: sumBig(rows.map((r) => r.sgstPaise)).toString(),
      igstPaise: sumBig(rows.map((r) => r.igstPaise)).toString(),
      totalPaise: sumBig(rows.map((r) => r.totalPaise)).toString(),
      rows: rows.map((r) => ({
        invoiceNumber: r.invoiceNumber,
        invoiceDate: r.invoiceDate.toISOString().slice(0, 10),
        buyerGstin: r.buyerGstin,
        placeOfSupply: r.placeOfSupply,
        taxablePaise: r.taxablePaise.toString(),
        cgstPaise: r.cgstPaise.toString(),
        sgstPaise: r.sgstPaise.toString(),
        igstPaise: r.igstPaise.toString(),
        totalPaise: r.totalPaise.toString(),
        irn: r.irn,
        eInvoiceStatus: r.eInvoiceStatus,
        saasInvoiceId: r.saasInvoiceId,
        receiptId: r.receiptId,
      })),
    };
  }

  private async nextInvoiceNumber(
    tenantId: string,
    seriesPrefix: string,
    fiscalYear: string,
  ): Promise<string> {
    const count = await this.prisma.gSTInvoice.count({
      where: { tenantId, fiscalYear, seriesPrefix },
    });
    const seq = String(count + 1).padStart(6, "0");
    const [yStart, yEnd] = fiscalYear.split("-");
    const fyShort = `${(yStart ?? "").slice(-2)}${yEnd ?? ""}`;
    return `${seriesPrefix}/${fyShort}/${seq}`;
  }
}

function sumBig(values: bigint[]): bigint {
  return values.reduce((a, b) => a + b, 0n);
}

function quarterDateRange(
  fiscalYear: string,
  quarter: string,
): { from: Date; to: Date } {
  const [startY] = fiscalYear.split("-").map(Number);
  if (!startY || !/^Q[1-4]$/.test(quarter)) {
    throw new BadRequestException("Invalid fiscalYear/quarter");
  }
  const q = Number(quarter.slice(1));
  // Q1 = Apr–Jun of startY
  const startMonth = 3 + (q - 1) * 3; // 3,6,9,12 — but Q4 is Jan–Mar of startY+1
  if (q === 4) {
    return {
      from: new Date(Date.UTC(startY + 1, 0, 1)),
      to: new Date(Date.UTC(startY + 1, 2, 31, 23, 59, 59, 999)),
    };
  }
  const from = new Date(Date.UTC(startY, startMonth, 1));
  const toMonth = startMonth + 2;
  const lastDay = new Date(Date.UTC(startY, toMonth + 1, 0)).getUTCDate();
  const to = new Date(
    Date.UTC(startY, toMonth, lastDay, 23, 59, 59, 999),
  );
  return { from, to };
}

function serializeGstInvoice(inv: {
  id: string;
  tenantId: string;
  companyId: string | null;
  invoiceNumber: string;
  type: string;
  status: string;
  items: unknown;
  supplierGstin: string;
  supplierStateCode: string;
  buyerGstin: string | null;
  buyerStateCode: string;
  buyerName: string | null;
  placeOfSupply: string;
  customerId: string | null;
  vendorId: string | null;
  saasInvoiceId: string | null;
  receiptId: string | null;
  taxablePaise: bigint;
  cgstPaise: bigint;
  sgstPaise: bigint;
  igstPaise: bigint;
  totalGstPaise: bigint;
  totalPaise: bigint;
  currency: string;
  invoiceDate: Date;
  dueDate: Date | null;
  fiscalYear: string;
  seriesPrefix: string;
  irn: string | null;
  irnAckNo: string | null;
  irnAckDate: Date | null;
  signedQr: string | null;
  eInvoiceStatus: string;
  eInvoiceProvider: string | null;
  eInvoiceError: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: inv.id,
    tenantId: inv.tenantId,
    companyId: inv.companyId,
    invoiceNumber: inv.invoiceNumber,
    type: inv.type,
    status: inv.status,
    items: inv.items,
    supplierGstin: inv.supplierGstin,
    supplierStateCode: inv.supplierStateCode,
    buyerGstin: inv.buyerGstin,
    buyerStateCode: inv.buyerStateCode,
    buyerName: inv.buyerName,
    placeOfSupply: inv.placeOfSupply,
    customerId: inv.customerId,
    vendorId: inv.vendorId,
    saasInvoiceId: inv.saasInvoiceId,
    receiptId: inv.receiptId,
    taxablePaise: inv.taxablePaise.toString(),
    cgstPaise: inv.cgstPaise.toString(),
    sgstPaise: inv.sgstPaise.toString(),
    igstPaise: inv.igstPaise.toString(),
    totalGstPaise: inv.totalGstPaise.toString(),
    totalPaise: inv.totalPaise.toString(),
    currency: inv.currency,
    invoiceDate: inv.invoiceDate,
    dueDate: inv.dueDate,
    fiscalYear: inv.fiscalYear,
    seriesPrefix: inv.seriesPrefix,
    irn: inv.irn,
    irnAckNo: inv.irnAckNo,
    irnAckDate: inv.irnAckDate,
    signedQr: inv.signedQr,
    eInvoiceStatus: inv.eInvoiceStatus,
    eInvoiceProvider: inv.eInvoiceProvider,
    eInvoiceError: inv.eInvoiceError,
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,
  };
}
