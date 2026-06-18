import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma.service";

@Injectable()
export class LmsYpsrService {
  constructor(private readonly prisma: PrismaService) {}

  async findSiteVisits(tenantId: string, status?: string) {
    return this.prisma.siteVisit.findMany({
      where: {
        lead: { tenantId },
        ...(status && { status: status as never }),
      },
      include: {
        lead: { select: { firstName: true, lastName: true, phone: true } },
        project: { select: { id: true, name: true } },
        ypsrReport: true,
      },
      orderBy: { scheduledAt: "desc" },
    });
  }

  async createYpsr(
    tenantId: string,
    siteVisitId: string,
    dto: {
      unitsShown: string[];
      amenitiesPresented: string[];
      leadFeedback?: string;
      interestLevel: string;
      objections: string[];
      priceOffered?: number;
      followUpDate?: string;
      followUpAction?: string;
      outcome: string;
      photos?: string[];
    },
  ) {
    const visit = await this.prisma.siteVisit.findFirst({
      where: { id: siteVisitId, lead: { tenantId } },
      include: { lead: true, project: true },
    });
    if (!visit) throw new NotFoundException("Site visit not found");

    const [ypsr] = await this.prisma.$transaction([
      this.prisma.ypsrReport.upsert({
        where: { siteVisitId },
        create: {
          siteVisitId,
          projectId: visit.projectId,
          visitDate: visit.scheduledAt,
          leadName: `${visit.lead.firstName} ${visit.lead.lastName ?? ""}`.trim(),
          salesPerson: visit.attendedBy ?? "—",
          unitsShown: dto.unitsShown,
          amenitiesPresented: dto.amenitiesPresented,
          leadFeedback: dto.leadFeedback,
          interestLevel: dto.interestLevel as never,
          objections: dto.objections,
          priceOffered: dto.priceOffered,
          followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : undefined,
          followUpAction: dto.followUpAction,
          outcome: dto.outcome as never,
          photos: dto.photos ?? [],
        },
        update: {
          unitsShown: dto.unitsShown,
          amenitiesPresented: dto.amenitiesPresented,
          leadFeedback: dto.leadFeedback,
          interestLevel: dto.interestLevel as never,
          objections: dto.objections,
          priceOffered: dto.priceOffered,
          followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : undefined,
          followUpAction: dto.followUpAction,
          outcome: dto.outcome as never,
          photos: dto.photos ?? [],
        },
      }),
      this.prisma.siteVisit.update({
        where: { id: siteVisitId },
        data: { status: "COMPLETED", completedAt: new Date() },
      }),
    ]);

    return ypsr;
  }

  async getYpsr(tenantId: string, siteVisitId: string) {
    const report = await this.prisma.ypsrReport.findFirst({
      where: { siteVisitId, siteVisit: { lead: { tenantId } } },
      include: { siteVisit: { include: { lead: true, project: true } } },
    });
    if (!report) throw new NotFoundException("YPSR report not found");
    return report;
  }
}
