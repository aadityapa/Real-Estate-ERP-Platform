import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";
import { PdfService } from "../../../common/services/pdf.service";
import { EventsService } from "../../events/events.service";
import { RecordPaymentDto } from "./dto/payment.dto";

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly eventsService: EventsService,
  ) {}

  async findByBooking(tenantId: string, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, lead: { tenantId } },
    });
    if (!booking) throw new NotFoundException("Booking not found");

    return this.prisma.payment.findMany({
      where: { bookingId },
      orderBy: { dueDate: "asc" },
      include: { receipt: true },
    });
  }

  async recordPayment(
    tenantId: string,
    paymentId: string,
    dto: RecordPaymentDto,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, booking: { lead: { tenantId } } },
      include: {
        booking: {
          include: {
            customer: true,
            lead: true,
          },
        },
      },
    });

    if (!payment) throw new NotFoundException("Payment not found");
    if (payment.status === "PAID") {
      throw new BadRequestException("Payment already recorded");
    }

    const paidAmount = dto.amount;
    const receiptNumber = `RCP-${Date.now()}`;
    const paidDate = dto.paidDate ? new Date(dto.paidDate) : new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const receipt = await tx.receipt.create({
        data: {
          receiptNumber,
          bookingId: payment.bookingId,
          amount: paidAmount,
          paymentMode: dto.paymentMode,
          reference: dto.reference,
          date: paidDate,
        },
      });

      const pdfUrl = await this.pdfService.generateReceipt({
        receiptNumber,
        bookingNumber: payment.booking.bookingNumber,
        buyerName: `${payment.booking.customer.firstName} ${payment.booking.customer.lastName}`,
        amount: paidAmount,
        paymentMode: dto.paymentMode,
        reference: dto.reference,
        date: paidDate.toLocaleDateString("en-IN"),
        installmentName: payment.installmentName,
      });

      await tx.receipt.update({
        where: { id: receipt.id },
        data: { pdfUrl },
      });

      const newPaidAmount = Number(payment.paidAmount) + paidAmount;
      const totalDue = Number(payment.amount);
      let status: "PENDING" | "PARTIAL" | "PAID" = "PARTIAL";
      if (newPaidAmount >= totalDue) status = "PAID";
      else if (newPaidAmount === 0) status = "PENDING";

      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          paidAmount: newPaidAmount,
          paidDate,
          paymentMode: dto.paymentMode,
          reference: dto.reference,
          status,
          receiptId: receipt.id,
        },
        include: { receipt: true },
      });

      return { payment: updatedPayment, receipt: { ...receipt, pdfUrl } };
    });

    this.eventsService.emitPaymentReceived(tenantId, {
      amount: paidAmount,
      bookingNumber: payment.booking.bookingNumber,
    });

    return result;
  }

  async getReceiptPdfPath(
    tenantId: string,
    receiptId: string,
  ): Promise<string | null> {
    const receipt = await this.prisma.receipt.findFirst({
      where: { id: receiptId, booking: { lead: { tenantId } } },
    });
    return receipt?.pdfUrl ?? null;
  }
}
