import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { AgreementType } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";
import { PdfService } from "../../../common/services/pdf.service";
import { TenantUsageService } from "../../../common/limits/tenant-usage.service";
import {
  CreateAgreementTemplateDto,
  GenerateFromTemplateDto,
  UpdateAgreementTemplateDto,
  mergeTemplate,
} from "./dto/agreement-template.dto";

const DEFAULT_ALLOTMENT_BODY = `This Allotment Letter / Agreement to Sell is entered into between:

Developer: {{companyName}}
Buyer: {{buyerName}} (Phone: {{buyerPhone}})

PROPERTY DETAILS
Project: {{projectName}}
Unit: {{unitNumber}} ({{unitType}})
RERA: {{reraNumber}}

FINANCIAL TERMS
Total Sale Consideration: ₹{{totalAmount}}
Booking Amount Received: ₹{{bookingAmount}}
Booking Date: {{bookingDate}}
Agreement No: {{agreementNumber}}
Booking No: {{bookingNumber}}

The buyer agrees to make further payments as per the payment plan and RERA-linked construction stages. This document is subject to the registered Builder-Buyer Agreement.`;

@Injectable()
export class AgreementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly usage: TenantUsageService,
  ) {}

  async listTemplates(tenantId: string, type?: AgreementType) {
    return this.prisma.agreementTemplate.findMany({
      where: {
        tenantId,
        ...(type ? { type } : {}),
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async getTemplate(tenantId: string, id: string) {
    const t = await this.prisma.agreementTemplate.findFirst({
      where: { id, tenantId },
    });
    if (!t) throw new NotFoundException("Agreement template not found");
    return t;
  }

  async createTemplate(tenantId: string, dto: CreateAgreementTemplateDto) {
    return this.prisma.agreementTemplate.create({
      data: {
        tenantId,
        name: dto.name,
        type: dto.type,
        bodyText: dto.bodyText,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateTemplate(
    tenantId: string,
    id: string,
    dto: UpdateAgreementTemplateDto,
  ) {
    await this.getTemplate(tenantId, id);
    return this.prisma.agreementTemplate.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.bodyText !== undefined
          ? { bodyText: dto.bodyText, version: { increment: 1 } }
          : dto.version !== undefined
            ? { version: dto.version }
            : {}),
      },
    });
  }

  async ensureDefaultTemplate(tenantId: string, type: AgreementType) {
    const existing = await this.prisma.agreementTemplate.findFirst({
      where: { tenantId, type, isActive: true },
      orderBy: { version: "desc" },
    });
    if (existing) return existing;

    return this.prisma.agreementTemplate.create({
      data: {
        tenantId,
        name:
          type === "SALE"
            ? "Default Agreement to Sell"
            : type === "REGISTRATION"
              ? "Default Registration Deed"
              : "Default Allotment Letter",
        type,
        bodyText: DEFAULT_ALLOTMENT_BODY,
        isActive: true,
      },
    });
  }

  /**
   * Merge template with booking data → PDF → Document vault (versioned) + Agreement.
   */
  async generateFromBooking(
    tenantId: string,
    userId: string,
    dto: GenerateFromTemplateDto,
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        id: dto.bookingId,
        OR: [{ customer: { tenantId } }, { lead: { tenantId } }],
      },
      include: {
        customer: true,
        unit: {
          include: {
            project: { include: { company: true, reraProfile: true } },
          },
        },
        agreement: true,
      },
    });
    if (!booking) throw new NotFoundException("Booking not found");

    const type = (dto.type ?? booking.agreement?.type ?? "ALLOTMENT") as AgreementType;
    let template =
      dto.templateId != null
        ? await this.getTemplate(tenantId, dto.templateId)
        : await this.ensureDefaultTemplate(tenantId, type);

    if (template.type !== type && dto.templateId) {
      throw new BadRequestException("Template type does not match agreement type");
    }

    const agreementNumber =
      booking.agreement?.agreementNumber ?? `AGR-${Date.now()}`;
    const companyName = booking.unit.project.company?.name ?? "PropOS Developer";
    const buyerName = `${booking.customer.firstName} ${booking.customer.lastName}`;
    const bookingDate = booking.bookingDate.toLocaleDateString("en-IN");
    const vars: Record<string, string> = {
      agreementNumber,
      bookingNumber: booking.bookingNumber,
      buyerName,
      buyerPhone: booking.customer.phone,
      projectName: booking.unit.project.name,
      unitNumber: booking.unit.unitNumber,
      unitType: booking.unit.type,
      totalAmount: Number(booking.totalAmount).toLocaleString("en-IN"),
      bookingAmount: Number(booking.bookingAmount).toLocaleString("en-IN"),
      bookingDate,
      companyName,
      reraNumber:
        booking.unit.project.reraProfile?.reraNumber ??
        booking.unit.project.reraNumber ??
        "",
    };

    const bodyText = mergeTemplate(template.bodyText, vars);
    const title =
      type === "SALE"
        ? "AGREEMENT TO SELL"
        : type === "REGISTRATION"
          ? "REGISTRATION DEED"
          : "ALLOTMENT AGREEMENT";

    const pdf = await this.pdfService.generateAgreement({
      agreementNumber,
      bookingNumber: booking.bookingNumber,
      buyerName,
      buyerPhone: booking.customer.phone,
      projectName: booking.unit.project.name,
      unitNumber: booking.unit.unitNumber,
      unitType: booking.unit.type,
      totalAmount: Number(booking.totalAmount),
      bookingAmount: Number(booking.bookingAmount),
      bookingDate,
      companyName,
      bodyText,
      title,
    });

    await this.usage.assertStorageAvailable(tenantId, pdf.fileSize);

    const result = await this.prisma.$transaction(async (tx) => {
      let documentId = booking.agreement?.documentId ?? null;
      let version = 1;

      if (documentId) {
        const existing = await tx.document.findFirst({
          where: { id: documentId, tenantId },
        });
        if (existing) {
          version = existing.version + 1;
          await tx.documentVersion.create({
            data: {
              documentId,
              version: existing.version,
              fileUrl: existing.fileUrl,
              checksum: existing.checksum,
              changes: "superseded by regenerate",
              uploadedBy: userId,
            },
          });
          await tx.document.update({
            where: { id: documentId },
            data: {
              fileUrl: pdf.url,
              checksum: pdf.checksum,
              fileSize: pdf.fileSize,
              version,
              mimeType: "application/pdf",
              name: `${title} ${agreementNumber}`,
            },
          });
        } else {
          documentId = null;
        }
      }

      if (!documentId) {
        const doc = await tx.document.create({
          data: {
            tenantId,
            projectId: booking.unit.projectId,
            category: "AGREEMENT",
            name: `${title} ${agreementNumber}`,
            description: `Generated from template ${template.id}`,
            fileUrl: pdf.url,
            fileSize: pdf.fileSize,
            mimeType: "application/pdf",
            checksum: pdf.checksum,
            version: 1,
            tags: ["agreement", type.toLowerCase()],
            isConfidential: true,
            uploadedBy: userId,
          },
        });
        documentId = doc.id;
        version = 1;
      }

      if (booking.agreement) {
        return tx.agreement.update({
          where: { id: booking.agreement.id },
          data: {
            type,
            templateId: template.id,
            documentId,
            documentUrl: pdf.url,
            documentChecksum: pdf.checksum,
            version,
            stampDuty: dto.stampDuty,
            registrationFee: dto.registrationFee,
            status: "SENT",
            executedDate: booking.agreement.executedDate ?? new Date(),
          },
          include: { document: true, template: true },
        });
      }

      const agr = await tx.agreement.create({
        data: {
          agreementNumber,
          bookingId: booking.id,
          type,
          templateId: template.id,
          documentId,
          documentUrl: pdf.url,
          documentChecksum: pdf.checksum,
          version,
          stampDuty: dto.stampDuty,
          registrationFee: dto.registrationFee,
          status: "SENT",
          executedDate: new Date(),
        },
        include: { document: true, template: true },
      });

      await tx.booking.update({
        where: { id: booking.id },
        data: { status: "AGREEMENT" },
      });

      return agr;
    });

    return result;
  }
}
