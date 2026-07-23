import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import { getResidencyStatus } from "../../common/residency/data-residency";
import {
  CorrectCustomerDto,
  EraseCustomerDto,
  RecordConsentDto,
} from "./dto/privacy.dto";

export interface CustomerExportPackage {
  exportedAt: string;
  schemaVersion: 1;
  subject: "customer";
  customer: Record<string, unknown>;
  consents: Array<Record<string, unknown>>;
  bookings: Array<Record<string, unknown>>;
  complaints: Array<Record<string, unknown>>;
  tickets: Array<Record<string, unknown>>;
  counts: Record<string, number>;
}

@Injectable()
export class PrivacyService {
  private readonly logger = new Logger(PrivacyService.name);

  constructor(private readonly prisma: PrismaService) {}

  listPurposes() {
    return this.prisma.consentPurpose.findMany({
      where: { isActive: true },
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
      },
    });
  }

  async getConsentStatus(tenantId: string, customerId: string) {
    await this.requireCustomer(tenantId, customerId);
    const [purposes, consents] = await Promise.all([
      this.prisma.consentPurpose.findMany({
        where: { isActive: true },
        orderBy: { code: "asc" },
      }),
      this.prisma.customerConsent.findMany({
        where: { tenantId, customerId },
        include: { purpose: { select: { code: true, name: true } } },
      }),
    ]);

    const byPurpose = new Map(consents.map((c) => [c.purposeId, c]));
    return {
      customerId,
      purposes: purposes.map((p) => {
        const row = byPurpose.get(p.id);
        return {
          purposeCode: p.code,
          purposeName: p.name,
          granted: row?.granted ?? null,
          grantedAt: row?.grantedAt?.toISOString() ?? null,
          revokedAt: row?.revokedAt?.toISOString() ?? null,
          channel: row?.channel ?? null,
          noticeVersion: row?.noticeVersion ?? null,
          updatedAt: row?.updatedAt?.toISOString() ?? null,
        };
      }),
    };
  }

  async recordConsent(
    tenantId: string,
    customerId: string,
    dto: RecordConsentDto,
    recordedBy?: string,
  ) {
    await this.requireCustomer(tenantId, customerId);
    const purpose = await this.prisma.consentPurpose.findUnique({
      where: { code: dto.purposeCode },
    });
    if (!purpose || !purpose.isActive) {
      throw new BadRequestException(`Unknown purpose: ${dto.purposeCode}`);
    }

    const now = new Date();
    const data: Prisma.CustomerConsentUncheckedCreateInput = {
      tenantId,
      customerId,
      purposeId: purpose.id,
      granted: dto.granted,
      grantedAt: dto.granted ? now : null,
      revokedAt: dto.granted ? null : now,
      channel: dto.channel,
      noticeVersion: dto.noticeVersion,
      recordedBy,
    };

    const row = await this.prisma.customerConsent.upsert({
      where: {
        tenantId_customerId_purposeId: {
          tenantId,
          customerId,
          purposeId: purpose.id,
        },
      },
      create: data,
      update: {
        granted: dto.granted,
        grantedAt: dto.granted ? now : undefined,
        revokedAt: dto.granted ? null : now,
        channel: dto.channel,
        noticeVersion: dto.noticeVersion,
        recordedBy,
      },
      include: { purpose: { select: { code: true, name: true } } },
    });

    this.logger.log(
      `Consent recorded customerId=${customerId} purpose=${dto.purposeCode} granted=${dto.granted}`,
    );

    return {
      purposeCode: row.purpose.code,
      purposeName: row.purpose.name,
      granted: row.granted,
      grantedAt: row.grantedAt?.toISOString() ?? null,
      revokedAt: row.revokedAt?.toISOString() ?? null,
      channel: row.channel,
      noticeVersion: row.noticeVersion,
    };
  }

  async exportCustomer(
    tenantId: string,
    customerId: string,
    requestedBy?: string,
  ): Promise<CustomerExportPackage> {
    const customer = await this.requireCustomer(tenantId, customerId);

    const [consents, bookings, complaints, tickets] = await Promise.all([
      this.prisma.customerConsent.findMany({
        where: { tenantId, customerId },
        include: { purpose: { select: { code: true, name: true } } },
      }),
      this.prisma.booking.findMany({
        where: { customerId },
        select: {
          id: true,
          bookingNumber: true,
          status: true,
          totalAmount: true,
          createdAt: true,
        },
      }),
      this.prisma.complaint.findMany({
        where: { customerId },
        select: {
          id: true,
          category: true,
          status: true,
          priority: true,
          createdAt: true,
        },
      }),
      this.prisma.supportTicket.findMany({
        where: { customerId },
        select: {
          id: true,
          ticketNumber: true,
          subject: true,
          status: true,
          category: true,
          createdAt: true,
        },
      }),
    ]);

    await this.prisma.dataSubjectRequest.create({
      data: {
        tenantId,
        customerId,
        type: "ACCESS",
        status: "COMPLETED",
        requestedBy,
        completedAt: new Date(),
        notes: "export",
      },
    });

    this.logger.log(`Customer export completed customerId=${customerId}`);

    return {
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      subject: "customer",
      customer: serializeRow(customer),
      consents: consents.map((c) =>
        serializeRow({
          purposeCode: c.purpose.code,
          purposeName: c.purpose.name,
          granted: c.granted,
          grantedAt: c.grantedAt,
          revokedAt: c.revokedAt,
          channel: c.channel,
          noticeVersion: c.noticeVersion,
        }),
      ),
      bookings: bookings.map((b) => serializeRow(b)),
      complaints: complaints.map((c) => serializeRow(c)),
      tickets: tickets.map((t) => serializeRow(t)),
      counts: {
        consents: consents.length,
        bookings: bookings.length,
        complaints: complaints.length,
        tickets: tickets.length,
      },
    };
  }

  async correctCustomer(
    tenantId: string,
    customerId: string,
    dto: CorrectCustomerDto,
    requestedBy?: string,
  ) {
    const existing = await this.requireCustomer(tenantId, customerId);
    if (existing.erasedAt) {
      throw new BadRequestException("Cannot correct an erased customer");
    }

    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: {
        ...dto,
        address: dto.address as Prisma.InputJsonValue | undefined,
      },
    });

    await this.prisma.dataSubjectRequest.create({
      data: {
        tenantId,
        customerId,
        type: "CORRECTION",
        status: "COMPLETED",
        requestedBy,
        completedAt: new Date(),
        notes: `fields=${Object.keys(dto).sort().join(",")}`,
      },
    });

    this.logger.log(`Customer correction completed customerId=${customerId}`);
    return updated;
  }

  async eraseCustomer(
    tenantId: string,
    customerId: string,
    dto: EraseCustomerDto,
    requestedBy?: string,
  ) {
    if (dto.confirmCustomerId !== customerId) {
      throw new BadRequestException(
        "confirmCustomerId must exactly match the customer id",
      );
    }

    const existing = await this.requireCustomer(tenantId, customerId);
    if (existing.erasedAt) {
      return {
        customerId,
        erasedAt: existing.erasedAt.toISOString(),
        alreadyErased: true,
      };
    }

    const erasedAt = new Date();
    // Keep row for booking FK / legal retention; scrub PII. Unique phone slot.
    await this.prisma.$transaction(async (tx) => {
      await tx.customerConsent.deleteMany({
        where: { tenantId, customerId },
      });
      await tx.customer.update({
        where: { id: customerId },
        data: {
          firstName: "Erased",
          lastName: "Principal",
          email: null,
          phone: `erased-${customerId}`,
          alternatePhone: null,
          pan: null,
          aadhaar: null,
          address: Prisma.JsonNull,
          documents: Prisma.JsonNull,
          portalAccess: false,
          portalPassword: null,
          erasedAt,
        },
      });
      await tx.dataSubjectRequest.create({
        data: {
          tenantId,
          customerId,
          type: "ERASURE",
          status: "COMPLETED",
          requestedBy,
          completedAt: erasedAt,
          notes: "pii-scrubbed",
        },
      });
    });

    this.logger.log(`Customer erasure completed customerId=${customerId}`);
    return {
      customerId,
      erasedAt: erasedAt.toISOString(),
      alreadyErased: false,
    };
  }

  residencyStatus() {
    return getResidencyStatus();
  }

  private async requireCustomer(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) throw new NotFoundException("Customer not found");
    return customer;
  }
}

function serializeRow(row: object): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(row, (_k, v: unknown) =>
      typeof v === "bigint" ? v.toString() : v,
    ),
  ) as Record<string, unknown>;
}
