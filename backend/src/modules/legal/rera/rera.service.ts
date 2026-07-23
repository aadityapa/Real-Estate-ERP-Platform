import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";
import {
  CheckReraPaymentDto,
  PatchReraPaymentStageDto,
  ReplaceReraPaymentStagesDto,
  UpsertReraProfileDto,
} from "./dto/rera.dto";
import {
  evaluateCarpetArea,
  evaluatePaymentStageRule,
  rupeesToPaise,
  type ReraStageInput,
} from "./rera-rules";

@Injectable()
export class ReraService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertProject(tenantId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, company: { tenantId } },
      include: { company: { select: { id: true, name: true, tenantId: true } } },
    });
    if (!project) throw new NotFoundException("Project not found");
    return project;
  }

  async getProfile(tenantId: string, projectId: string) {
    await this.assertProject(tenantId, projectId);
    const profile = await this.prisma.reraProjectProfile.findFirst({
      where: { tenantId, projectId },
    });
    if (!profile) throw new NotFoundException("RERA profile not found");
    return profile;
  }

  async upsertProfile(
    tenantId: string,
    projectId: string,
    dto: UpsertReraProfileDto,
  ) {
    await this.assertProject(tenantId, projectId);

    const data = {
      reraNumber: dto.reraNumber.trim().toUpperCase(),
      registrationDate: dto.registrationDate
        ? new Date(dto.registrationDate)
        : undefined,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      promoterName: dto.promoterName,
      totalCarpetAreaSqm:
        dto.totalCarpetAreaSqm != null
          ? new Prisma.Decimal(dto.totalCarpetAreaSqm)
          : undefined,
      openParkingCount: dto.openParkingCount,
      coveredParkingCount: dto.coveredParkingCount,
      disclosures: dto.disclosures as Prisma.InputJsonValue | undefined,
      projectWebsiteUrl: dto.projectWebsiteUrl,
      lastDisclosureAt: dto.lastDisclosureAt
        ? new Date(dto.lastDisclosureAt)
        : undefined,
    };

    const profile = await this.prisma.$transaction(async (tx) => {
      const row = await tx.reraProjectProfile.upsert({
        where: { projectId },
        create: {
          tenantId,
          projectId,
          reraNumber: data.reraNumber,
          registrationDate: data.registrationDate,
          validUntil: data.validUntil,
          promoterName: data.promoterName,
          totalCarpetAreaSqm: data.totalCarpetAreaSqm,
          openParkingCount: data.openParkingCount,
          coveredParkingCount: data.coveredParkingCount,
          disclosures: data.disclosures,
          projectWebsiteUrl: data.projectWebsiteUrl,
          lastDisclosureAt: data.lastDisclosureAt,
        },
        update: {
          reraNumber: data.reraNumber,
          ...(data.registrationDate !== undefined
            ? { registrationDate: data.registrationDate }
            : {}),
          ...(data.validUntil !== undefined
            ? { validUntil: data.validUntil }
            : {}),
          ...(data.promoterName !== undefined
            ? { promoterName: data.promoterName }
            : {}),
          ...(data.totalCarpetAreaSqm !== undefined
            ? { totalCarpetAreaSqm: data.totalCarpetAreaSqm }
            : {}),
          ...(data.openParkingCount !== undefined
            ? { openParkingCount: data.openParkingCount }
            : {}),
          ...(data.coveredParkingCount !== undefined
            ? { coveredParkingCount: data.coveredParkingCount }
            : {}),
          ...(data.disclosures !== undefined
            ? { disclosures: data.disclosures }
            : {}),
          ...(data.projectWebsiteUrl !== undefined
            ? { projectWebsiteUrl: data.projectWebsiteUrl }
            : {}),
          ...(data.lastDisclosureAt !== undefined
            ? { lastDisclosureAt: data.lastDisclosureAt }
            : {}),
        },
      });

      await tx.project.update({
        where: { id: projectId },
        data: { reraNumber: data.reraNumber },
      });

      return row;
    });

    return profile;
  }

  async listStages(tenantId: string, projectId: string) {
    await this.assertProject(tenantId, projectId);
    return this.prisma.reraPaymentStage.findMany({
      where: { tenantId, projectId },
      orderBy: { sortOrder: "asc" },
    });
  }

  async replaceStages(
    tenantId: string,
    projectId: string,
    dto: ReplaceReraPaymentStagesDto,
  ) {
    await this.assertProject(tenantId, projectId);
    const codes = new Set(dto.stages.map((s) => s.code));
    if (codes.size !== dto.stages.length) {
      throw new BadRequestException("Duplicate stage codes");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.reraPaymentStage.deleteMany({ where: { tenantId, projectId } });
      if (dto.stages.length === 0) return;
      await tx.reraPaymentStage.createMany({
        data: dto.stages.map((s) => ({
          tenantId,
          projectId,
          code: s.code.trim().toUpperCase(),
          name: s.name,
          maxCumulativePctBps: s.maxCumulativePctBps,
          sortOrder: s.sortOrder,
          isCompleted: s.isCompleted ?? false,
          linkedMilestoneName: s.linkedMilestoneName,
        })),
      });
    });

    return this.listStages(tenantId, projectId);
  }

  async patchStage(
    tenantId: string,
    projectId: string,
    stageId: string,
    dto: PatchReraPaymentStageDto,
  ) {
    await this.assertProject(tenantId, projectId);
    const stage = await this.prisma.reraPaymentStage.findFirst({
      where: { id: stageId, tenantId, projectId },
    });
    if (!stage) throw new NotFoundException("RERA payment stage not found");

    return this.prisma.reraPaymentStage.update({
      where: { id: stageId },
      data: {
        ...(dto.isCompleted !== undefined
          ? { isCompleted: dto.isCompleted }
          : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.maxCumulativePctBps !== undefined
          ? { maxCumulativePctBps: dto.maxCumulativePctBps }
          : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.linkedMilestoneName !== undefined
          ? { linkedMilestoneName: dto.linkedMilestoneName }
          : {}),
      },
    });
  }

  async checkPayment(tenantId: string, projectId: string, dto: CheckReraPaymentDto) {
    await this.assertProject(tenantId, projectId);

    let proposed: bigint;
    try {
      proposed = BigInt(dto.proposedPaymentPaise);
    } catch {
      throw new BadRequestException("proposedPaymentPaise must be an integer string");
    }
    if (proposed < 0n) {
      throw new BadRequestException("proposedPaymentPaise must be non-negative");
    }

    const booking = await this.prisma.booking.findFirst({
      where: {
        id: dto.bookingId,
        unit: { projectId, project: { company: { tenantId } } },
        OR: [
          { customer: { tenantId } },
          { lead: { tenantId } },
        ],
      },
      include: {
        payments: { select: { paidAmount: true, status: true } },
      },
    });
    if (!booking) throw new NotFoundException("Booking not found");

    const stages = await this.prisma.reraPaymentStage.findMany({
      where: { tenantId, projectId },
      orderBy: { sortOrder: "asc" },
    });

    const stageInputs: ReraStageInput[] = stages.map((s) => ({
      code: s.code,
      name: s.name,
      maxCumulativePctBps: s.maxCumulativePctBps,
      sortOrder: s.sortOrder,
      isCompleted: s.isCompleted,
    }));

    const alreadyPaid = booking.payments
      .filter((p) => p.status === "PAID" || Number(p.paidAmount) > 0)
      .reduce((sum, p) => sum + rupeesToPaise(Number(p.paidAmount)), 0n);

    const evalResult = evaluatePaymentStageRule({
      totalConsiderationPaise: rupeesToPaise(Number(booking.totalAmount)),
      alreadyPaidPaise: alreadyPaid,
      proposedPaymentPaise: proposed,
      stages: stageInputs,
    });

    return {
      bookingId: booking.id,
      projectId,
      ...evalResult,
      maxAllowedPaise: evalResult.maxAllowedPaise.toString(),
      projectedPaidPaise: evalResult.projectedPaidPaise.toString(),
      alreadyPaidPaise: alreadyPaid.toString(),
      proposedPaymentPaise: proposed.toString(),
    };
  }

  /**
   * Flag units (carpet area) and bookings (payment vs stage caps) for a project.
   */
  async complianceReport(tenantId: string, projectId: string) {
    await this.assertProject(tenantId, projectId);

    const [profile, stages, units, bookings] = await Promise.all([
      this.prisma.reraProjectProfile.findFirst({ where: { tenantId, projectId } }),
      this.prisma.reraPaymentStage.findMany({
        where: { tenantId, projectId },
        orderBy: { sortOrder: "asc" },
      }),
      this.prisma.unit.findMany({
        where: { projectId, project: { company: { tenantId } } },
        select: {
          id: true,
          unitNumber: true,
          carpetArea: true,
          area: true,
        },
      }),
      this.prisma.booking.findMany({
        where: {
          unit: { projectId },
          OR: [{ customer: { tenantId } }, { lead: { tenantId } }],
          status: { not: "CANCELLED" },
        },
        include: {
          payments: { select: { paidAmount: true, status: true } },
          unit: { select: { id: true, unitNumber: true, carpetArea: true } },
        },
      }),
    ]);

    const stageInputs: ReraStageInput[] = stages.map((s) => ({
      code: s.code,
      name: s.name,
      maxCumulativePctBps: s.maxCumulativePctBps,
      sortOrder: s.sortOrder,
      isCompleted: s.isCompleted,
    }));

    const unitFlags = units.map((u) => {
      const carpet = u.carpetArea != null ? Number(u.carpetArea) : null;
      const evalResult = evaluateCarpetArea({
        unitCarpetAreaSqm: carpet,
        // Per-unit declared not stored; project total is aggregate — flag missing only
        // unless unit has carpetArea set for variance checks against itself (n/a).
      });
      return {
        unitId: u.id,
        unitNumber: u.unitNumber,
        carpetAreaSqm: carpet,
        ...evalResult,
      };
    });

    const bookingFlags = bookings.map((b) => {
      const paid = b.payments
        .filter((p) => p.status === "PAID" || Number(p.paidAmount) > 0)
        .reduce((sum, p) => sum + rupeesToPaise(Number(p.paidAmount)), 0n);
      const evalResult = evaluatePaymentStageRule({
        totalConsiderationPaise: rupeesToPaise(Number(b.totalAmount)),
        alreadyPaidPaise: paid,
        proposedPaymentPaise: 0n,
        stages: stageInputs,
      });
      const overCap = paid > evalResult.maxAllowedPaise;
      return {
        bookingId: b.id,
        unitId: b.unit.id,
        unitNumber: b.unit.unitNumber,
        alreadyPaidPaise: paid.toString(),
        maxAllowedPaise: evalResult.maxAllowedPaise.toString(),
        applicableStageCode: evalResult.applicableStageCode,
        configured: evalResult.configured,
        overCap,
        flags: overCap ? ["payment_exceeds_rera_stage_cap"] : [],
      };
    });

    return {
      projectId,
      reraNumber: profile?.reraNumber ?? null,
      hasProfile: Boolean(profile),
      stageCount: stages.length,
      units: {
        total: unitFlags.length,
        flagged: unitFlags.filter((u) => !u.ok).length,
        items: unitFlags.filter((u) => !u.ok),
      },
      bookings: {
        total: bookingFlags.length,
        flagged: bookingFlags.filter((b) => b.overCap).length,
        items: bookingFlags.filter((b) => b.overCap),
      },
    };
  }
}
