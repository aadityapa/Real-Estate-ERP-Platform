import { Injectable } from "@nestjs/common";
import { EventsGateway } from "./events.gateway";

export interface DashboardEvent {
  type: string;
  module: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

@Injectable()
export class EventsService {
  constructor(private readonly gateway: EventsGateway) {}

  emitToTenant(tenantId: string, event: DashboardEvent): void {
    this.gateway.server.to(`tenant:${tenantId}`).emit("dashboard:update", event);
  }

  emitLeadCreated(tenantId: string, lead: { id: string; firstName: string }): void {
    this.emitToTenant(tenantId, {
      type: "lead.created",
      module: "crm",
      message: `New lead: ${lead.firstName}`,
      data: { leadId: lead.id },
      timestamp: new Date().toISOString(),
    });
  }

  emitBookingCreated(
    tenantId: string,
    booking: { id: string; bookingNumber: string },
  ): void {
    this.emitToTenant(tenantId, {
      type: "booking.created",
      module: "sales",
      message: `Booking confirmed: ${booking.bookingNumber}`,
      data: { bookingId: booking.id },
      timestamp: new Date().toISOString(),
    });
  }

  emitPaymentReceived(
    tenantId: string,
    payment: { amount: number; bookingNumber: string },
  ): void {
    this.emitToTenant(tenantId, {
      type: "payment.received",
      module: "finance",
      message: `Payment received: ₹${payment.amount.toLocaleString("en-IN")} for ${payment.bookingNumber}`,
      data: payment,
      timestamp: new Date().toISOString(),
    });
  }

  emitLeadScored(tenantId: string, leadId: string, score: number): void {
    this.emitToTenant(tenantId, {
      type: "lead.scored",
      module: "ai",
      message: `Lead scored: ${score}/100`,
      data: { leadId, score },
      timestamp: new Date().toISOString(),
    });
  }

  emitLeadClaimed(
    tenantId: string,
    data: { leadId: string; claimedBy: string; claimedAt: string },
  ): void {
    this.gateway.server
      .to(`tenant:${tenantId}:data-feed`)
      .emit("lead:claimed", data);
    this.emitToTenant(tenantId, {
      type: "lead.claimed",
      module: "lms",
      message: "Lead claimed from data feed",
      data,
      timestamp: new Date().toISOString(),
    });
  }

  emitLeadReleased(tenantId: string, data: { leadId: string }): void {
    this.gateway.server
      .to(`tenant:${tenantId}:data-feed`)
      .emit("lead:released", data);
  }

  emitNewLeadToFeed(tenantId: string, lead: Record<string, unknown>): void {
    this.gateway.server
      .to(`tenant:${tenantId}:data-feed`)
      .emit("lead:new", lead);
  }
}
