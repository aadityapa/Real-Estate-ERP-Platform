import { Injectable, NotFoundException } from "@nestjs/common";
import { getPaginationParams } from "@propos/shared-utils";
import { PrismaService } from "../../database/prisma.service";
import { paginate } from "../../common/utils/paginate";

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async findMyTickets(tenantId: string, userId: string, page = 1, limit = 20) {
    const { skip, take } = getPaginationParams(page, limit);
    const where = { tenantId, raisedById: userId };

    const [items, total] = await Promise.all([
      this.prisma.helpdeskTicket.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          raisedBy: { select: { firstName: true, lastName: true } },
          assignedTo: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.helpdeskTicket.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async findAllAdmin(tenantId: string, page = 1, limit = 20) {
    const { skip, take } = getPaginationParams(page, limit);
    const where = { tenantId };

    const [items, total] = await Promise.all([
      this.prisma.helpdeskTicket.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          raisedBy: { select: { firstName: true, lastName: true } },
          assignedTo: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.helpdeskTicket.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async findOne(tenantId: string, id: string) {
    const ticket = await this.prisma.helpdeskTicket.findFirst({
      where: { id, tenantId },
      include: {
        raisedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        replies: {
          orderBy: { createdAt: "asc" },
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!ticket) throw new NotFoundException("Ticket not found");
    return ticket;
  }

  async create(
    tenantId: string,
    userId: string,
    dto: {
      subject: string;
      description: string;
      category?: string;
      priority?: string;
      module?: string;
      screenshots?: string[];
    },
  ) {
    const count = await this.prisma.helpdeskTicket.count({ where: { tenantId } });
    const ticketNumber = `TK-${String(count + 1).padStart(4, "0")}`;

    return this.prisma.helpdeskTicket.create({
      data: {
        tenantId,
        raisedById: userId,
        ticketNumber,
        subject: dto.subject,
        description: dto.description,
        category: (dto.category ?? "OTHER") as never,
        priority: (dto.priority ?? "MEDIUM") as never,
        module: dto.module,
        screenshots: dto.screenshots ?? [],
      },
    });
  }

  async reply(
    tenantId: string,
    ticketId: string,
    userId: string,
    message: string,
    attachments: string[] = [],
    isInternal = false,
  ) {
    const ticket = await this.prisma.helpdeskTicket.findFirst({
      where: { id: ticketId, tenantId },
    });
    if (!ticket) throw new NotFoundException("Ticket not found");

    return this.prisma.ticketReply.create({
      data: {
        ticketId,
        userId,
        message,
        attachments,
        isInternal,
      },
    });
  }

  async updateStatus(
    tenantId: string,
    id: string,
    status: string,
    resolution?: string,
  ) {
    const ticket = await this.prisma.helpdeskTicket.findFirst({
      where: { id, tenantId },
    });
    if (!ticket) throw new NotFoundException("Ticket not found");

    return this.prisma.helpdeskTicket.update({
      where: { id },
      data: {
        status: status as never,
        resolution,
        resolvedAt: status === "RESOLVED" ? new Date() : undefined,
      },
    });
  }
}
