import { Resolver, Query, Args, Int, Context } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { GqlAuthGuard } from "../guards/gql-auth.guard";
import { LeadsService } from "../../modules/crm/leads/leads.service";
import { BookingsService } from "../../modules/sales/bookings/bookings.service";
import {
  LeadType,
  BookingType,
  PaginatedLeads,
  CrmDashboardStats,
} from "../types/lead.type";
import type { JwtPayload } from "@propos/shared-types";

interface GqlContext {
  req: { user: JwtPayload };
}

@Resolver(() => LeadType)
export class LeadResolver {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly bookingsService: BookingsService,
  ) {}

  @UseGuards(GqlAuthGuard)
  @Query(() => PaginatedLeads, { name: "leads" })
  async getLeads(
    @Context() ctx: GqlContext,
    @Args("page", { type: () => Int, nullable: true }) page?: number,
    @Args("limit", { type: () => Int, nullable: true }) limit?: number,
    @Args("status", { nullable: true }) status?: string,
  ): Promise<PaginatedLeads> {
    const tenantId = ctx.req.user.tenantId;
    const result = await this.leadsService.findAll(tenantId, {
      page,
      limit,
      status: status as never,
    });

    return {
      items: result.data as unknown as LeadType[],
      total: result.meta.total,
    };
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => LeadType, { name: "lead", nullable: true })
  async getLead(
    @Context() ctx: GqlContext,
    @Args("id") id: string,
  ): Promise<LeadType | null> {
    const tenantId = ctx.req.user.tenantId;
    return this.leadsService.findOne(tenantId, id) as unknown as LeadType;
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => CrmDashboardStats, { name: "crmDashboard" })
  async getCrmDashboard(@Context() ctx: GqlContext): Promise<CrmDashboardStats> {
    const tenantId = ctx.req.user.tenantId;
    return this.leadsService.getDashboardStats(tenantId);
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => [BookingType], { name: "bookings" })
  async getBookings(@Context() ctx: GqlContext): Promise<BookingType[]> {
    const tenantId = ctx.req.user.tenantId;
    const result = await this.bookingsService.findAll(tenantId, { limit: 50 });
    return result.data.map((b) => ({
      id: b.id,
      bookingNumber: b.bookingNumber,
      status: b.status,
      totalAmount: Number(b.totalAmount),
      bookingDate: b.bookingDate,
      customerName: b.customer
        ? `${b.customer.firstName} ${b.customer.lastName}`
        : undefined,
    }));
  }
}
