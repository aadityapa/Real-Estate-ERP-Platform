import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { getPaginationParams } from "@propos/shared-utils";
import { PrismaService } from "../../../database/prisma.service";
import { paginate } from "../../../common/utils/paginate";
import { PdfService } from "../../../common/services/pdf.service";
import { EventsService } from "../../events/events.service";
import {
  CreateBookingDto,
  FilterBookingDto,
  UpdateBookingDto,
} from "./dto/booking.dto";
import {
  ConfirmBookingDto,
  GenerateAgreementDto,
  ReserveUnitDto,
} from "./dto/booking-flow.dto";

interface InstallmentItem {
  name: string;
  percentage: number;
  dueOn?: string;
  daysFromBooking?: number;
}

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly eventsService: EventsService,
  ) {}

  async findAll(tenantId: string, filter: FilterBookingDto) {
    const { skip, take, page, limit } = getPaginationParams(
      filter.page,
      filter.limit,
    );

    const where: Prisma.BookingWhereInput = {
      lead: { tenantId },
      ...(filter.status && { status: filter.status }),
      ...(filter.customerId && { customerId: filter.customerId }),
      ...(filter.search && {
        OR: [
          { bookingNumber: { contains: filter.search, mode: "insensitive" } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take,
        orderBy: { [filter.sortBy ?? "createdAt"]: filter.order ?? "desc" },
        include: {
          lead: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
          unit: { select: { id: true, unitNumber: true, type: true } },
          customer: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
          agreement: true,
          payments: { orderBy: { dueDate: "asc" } },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, lead: { tenantId } },
      include: {
        lead: true,
        unit: { include: { project: { include: { company: true } } } },
        customer: true,
        paymentPlan: true,
        payments: { orderBy: { dueDate: "asc" }, include: { receipt: true } },
        agreement: true,
        receipts: true,
      },
    });

    if (!booking) throw new NotFoundException("Booking not found");
    return booking;
  }

  async reserve(tenantId: string, dto: ReserveUnitDto) {
    const [lead, unit] = await Promise.all([
      this.prisma.lead.findFirst({ where: { id: dto.leadId, tenantId } }),
      this.prisma.unit.findFirst({
        where: {
          id: dto.unitId,
          project: { company: { tenantId } },
        },
        include: { project: { select: { id: true, name: true } } },
      }),
    ]);

    if (!lead) throw new NotFoundException("Lead not found");
    if (!unit) throw new NotFoundException("Unit not found");
    if (unit.status !== "AVAILABLE") {
      throw new BadRequestException(`Unit is ${unit.status}, cannot reserve`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const reservedUnit = await tx.unit.update({
        where: { id: dto.unitId },
        data: { status: "RESERVED" },
        include: { project: { select: { id: true, name: true } } },
      });

      await tx.lead.update({
        where: { id: dto.leadId },
        data: { status: "NEGOTIATION", projectId: unit.projectId },
      });

      return reservedUnit;
    });

    return {
      message: "Unit reserved successfully",
      leadId: dto.leadId,
      unit: updated,
      expiresIn: "48 hours",
    };
  }

  async confirm(tenantId: string, dto: ConfirmBookingDto) {
    const [lead, unit] = await Promise.all([
      this.prisma.lead.findFirst({ where: { id: dto.leadId, tenantId } }),
      this.prisma.unit.findFirst({
        where: {
          id: dto.unitId,
          project: { company: { tenantId } },
          status: { in: ["RESERVED", "AVAILABLE"] },
        },
        include: {
          project: { include: { company: true } },
        },
      }),
    ]);

    if (!lead) throw new NotFoundException("Lead not found");
    if (!unit) {
      throw new BadRequestException("Unit not available for booking");
    }

    let customerId = dto.customerId;
    if (customerId) {
      const owned = await this.prisma.customer.findFirst({
        where: { id: customerId, tenantId },
      });
      if (!owned) {
        throw new NotFoundException("Customer not found");
      }
    } else {
      const existing = await this.prisma.customer.findFirst({
        where: { tenantId, phone: lead.phone },
      });
      if (existing) {
        customerId = existing.id;
      } else {
        const customer = await this.prisma.customer.create({
          data: {
            tenantId,
            firstName: lead.firstName,
            lastName: lead.lastName ?? "",
            email: lead.email,
            phone: lead.phone,
          },
        });
        customerId = customer.id;
      }
    }

    const unitPrice = Number(unit.totalPrice);
    const premiumAmount = dto.premiumAmount ?? 0;
    const discountAmount = dto.discountAmount ?? 0;
    const totalAmount = unitPrice + premiumAmount - discountAmount;
    const bookingNumber = `BK-${Date.now()}`;

    const booking = await this.prisma.$transaction(async (tx) => {
      const created = await tx.booking.create({
        data: {
          bookingNumber,
          leadId: dto.leadId,
          unitId: dto.unitId,
          customerId,
          salesPersonId: dto.salesPersonId,
          unitPrice,
          premiumAmount,
          discountAmount,
          totalAmount,
          bookingAmount: dto.bookingAmount,
          bookingDate: new Date(dto.bookingDate),
          paymentPlanId: dto.paymentPlanId,
          status: "BOOKED",
        },
        include: {
          lead: true,
          unit: { include: { project: true } },
          customer: true,
        },
      });

      await tx.unit.update({
        where: { id: dto.unitId },
        data: { status: "BOOKED" },
      });

      await tx.lead.update({
        where: { id: dto.leadId },
        data: { status: "BOOKING" },
      });

      if (dto.paymentPlanId) {
        await this.createInstallments(tx, created.id, dto.paymentPlanId, new Date(dto.bookingDate));
      }

      return created;
    });

    this.eventsService.emitBookingCreated(tenantId, {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
    });

    return booking;
  }

  async generateAgreement(
    tenantId: string,
    bookingId: string,
    dto: GenerateAgreementDto,
  ) {
    const booking = await this.findOne(tenantId, bookingId);

    if (booking.agreement) {
      return booking.agreement;
    }

    const agreementNumber = `AGR-${Date.now()}`;
    const companyName =
      booking.unit.project.company?.name ?? "PropOS Developer";

    const pdf = await this.pdfService.generateAgreement({
      agreementNumber,
      bookingNumber: booking.bookingNumber,
      buyerName: `${booking.customer.firstName} ${booking.customer.lastName}`,
      buyerPhone: booking.customer.phone,
      projectName: booking.unit.project.name,
      unitNumber: booking.unit.unitNumber,
      unitType: booking.unit.type,
      totalAmount: Number(booking.totalAmount),
      bookingAmount: Number(booking.bookingAmount),
      bookingDate: booking.bookingDate.toLocaleDateString("en-IN"),
      companyName,
    });

    const agreement = await this.prisma.$transaction(async (tx) => {
      const agr = await tx.agreement.create({
        data: {
          agreementNumber,
          bookingId,
          type: dto.type,
          stampDuty: dto.stampDuty,
          registrationFee: dto.registrationFee,
          documentUrl: pdf.url,
          documentChecksum: pdf.checksum,
          status: "SENT",
          executedDate: new Date(),
        },
      });

      await tx.booking.update({
        where: { id: bookingId },
        data: { status: "AGREEMENT" },
      });

      return agr;
    });

    return agreement;
  }

  async create(tenantId: string, dto: CreateBookingDto) {
    return this.confirm(tenantId, {
      leadId: dto.leadId,
      unitId: dto.unitId,
      customerId: dto.customerId,
      salesPersonId: dto.salesPersonId,
      paymentPlanId: dto.paymentPlanId,
      premiumAmount: dto.premiumAmount,
      discountAmount: dto.discountAmount,
      bookingAmount: dto.bookingAmount,
      bookingDate: dto.bookingDate,
    });
  }

  async update(tenantId: string, id: string, dto: UpdateBookingDto) {
    await this.findOne(tenantId, id);

    return this.prisma.booking.update({
      where: { id },
      data: {
        ...dto,
        bookingDate: dto.bookingDate ? new Date(dto.bookingDate) : undefined,
        cancelledAt: dto.status === "CANCELLED" ? new Date() : undefined,
      },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true } },
        unit: { select: { id: true, unitNumber: true } },
        customer: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async cancel(tenantId: string, id: string, cancelReason?: string) {
    const booking = await this.findOne(tenantId, id);

    return this.prisma.$transaction(async (tx) => {
      const cancelled = await tx.booking.update({
        where: { id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelReason,
        },
      });

      await tx.unit.update({
        where: { id: booking.unitId },
        data: { status: "AVAILABLE" },
      });

      return cancelled;
    });
  }

  private async createInstallments(
    tx: Prisma.TransactionClient,
    bookingId: string,
    paymentPlanId: string,
    bookingDate: Date,
  ): Promise<void> {
    const plan = await tx.paymentPlan.findUnique({
      where: { id: paymentPlanId },
    });
    if (!plan) return;

    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return;

    const installments = plan.installments as unknown as InstallmentItem[];
    const totalAmount = Number(booking.totalAmount);

    for (const inst of installments) {
      const amount = (totalAmount * inst.percentage) / 100;
      let dueDate = new Date(bookingDate);
      if (inst.daysFromBooking) {
        dueDate.setDate(dueDate.getDate() + inst.daysFromBooking);
      }

      await tx.payment.create({
        data: {
          bookingId,
          installmentName: inst.name,
          dueDate,
          amount,
        },
      });
    }
  }
}
