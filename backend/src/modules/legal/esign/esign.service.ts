import {
  BadRequestException,
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ESignStatus } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";
import { AuditService } from "../../../common/audit/audit.service";
import {
  ESIGN_PROVIDER,
  type ESignProvider,
} from "./provider/esign.interface";
import { CreateESignRequestDto } from "./dto/esign.dto";

@Injectable()
export class ESignService {
  private readonly logger = new Logger(ESignService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ESIGN_PROVIDER) private readonly provider: ESignProvider,
    private readonly audit: AuditService,
  ) {}

  async findAll(tenantId: string, documentId?: string) {
    return this.prisma.eSignRequest.findMany({
      where: {
        tenantId,
        ...(documentId ? { documentId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async findOne(tenantId: string, id: string) {
    const row = await this.prisma.eSignRequest.findFirst({
      where: { id, tenantId },
    });
    if (!row) throw new NotFoundException("E-sign request not found");
    return row;
  }

  async create(tenantId: string, userId: string, dto: CreateESignRequestDto) {
    const document = await this.prisma.document.findFirst({
      where: { id: dto.documentId, tenantId },
    });
    if (!document) throw new NotFoundException("Document not found");

    if (dto.agreementId) {
      const agr = await this.prisma.agreement.findFirst({
        where: {
          id: dto.agreementId,
          documentId: dto.documentId,
          booking: {
            OR: [{ customer: { tenantId } }, { lead: { tenantId } }],
          },
        },
      });
      if (!agr) throw new NotFoundException("Agreement not found for document");
    }

    const baseUrl =
      process.env["PUBLIC_API_URL"] ??
      process.env["API_PUBLIC_URL"] ??
      "http://localhost:3001/api/v1";
    const webhookUrl = `${baseUrl.replace(/\/$/, "")}/legal/esign/webhook`;

    const created = await this.provider.createSigningRequest({
      correlationId: document.id,
      documentName: document.name,
      fileUrl: document.fileUrl,
      signerName: dto.signerName,
      signerEmail: dto.signerEmail,
      webhookUrl,
    });

    const providerEnum =
      this.provider.provider === "digio"
        ? "DIGIO"
        : this.provider.provider === "leegality"
          ? "LEEGALITY"
          : this.provider.provider === "docusign"
            ? "DOCUSIGN"
            : "MOCK";

    const row = await this.prisma.eSignRequest.create({
      data: {
        tenantId,
        documentId: document.id,
        agreementId: dto.agreementId,
        provider: providerEnum,
        providerRequestId: created.providerRequestId,
        status: created.status === "SENT" ? "SENT" : "PENDING",
        signUrl: created.signUrl,
        signerName: dto.signerName,
        signerEmail: dto.signerEmail,
      },
    });

    await this.audit.record({
      tenantId,
      actorId: userId,
      action: "CREATE",
      entity: "ESignRequest",
      entityId: row.id,
      after: {
        documentId: document.id,
        provider: row.provider,
        status: row.status,
      },
    });

    this.logger.log(`esign_request_created id=${row.id} provider=${row.provider}`);

    return row;
  }

  async handleWebhook(rawBody: string, signature: string | undefined) {
    const raw = Buffer.from(rawBody, "utf8");
    if (!this.provider.verifyWebhook(raw, signature)) {
      throw new UnauthorizedException("Invalid e-sign webhook signature");
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody) as unknown;
    } catch {
      throw new BadRequestException("Invalid webhook JSON");
    }

    let parsed;
    try {
      parsed = this.provider.parseWebhook(payload);
    } catch {
      throw new BadRequestException("Unrecognized e-sign webhook payload");
    }

    const row = await this.prisma.eSignRequest.findFirst({
      where: { providerRequestId: parsed.providerRequestId },
    });
    if (!row) {
      this.logger.warn(
        `esign_webhook_unknown_request id=${parsed.providerRequestId}`,
      );
      return { ok: true, status: "IGNORED" };
    }

    const status = parsed.status as ESignStatus;
    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.eSignRequest.update({
        where: { id: row.id },
        data: {
          status,
          signedFileUrl: parsed.signedFileUrl ?? row.signedFileUrl,
          lastWebhookAt: new Date(),
          completedAt:
            status === "SIGNED" || status === "DECLINED" || status === "EXPIRED"
              ? new Date()
              : row.completedAt,
        },
      });

      if (status === "SIGNED" && row.agreementId) {
        await tx.agreement.update({
          where: { id: row.agreementId },
          data: {
            status: "SIGNED",
            ...(parsed.signedFileUrl
              ? { documentUrl: parsed.signedFileUrl }
              : {}),
          },
        });
      }

      return next;
    });

    await this.audit.record({
      tenantId: row.tenantId,
      actorId: null,
      action: "UPDATE",
      entity: "ESignRequest",
      entityId: row.id,
      before: { status: row.status },
      after: { status },
    });

    this.logger.log(`esign_webhook_applied id=${row.id} status=${status}`);

    return { ok: true, id: updated.id, status: updated.status };
  }
}
