import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Server, Socket } from "socket.io";
import type { JwtPayload } from "@propos/shared-types";
import { getCorsOrigins } from "../../common/config/cors";

/** Roles that may join the LMS realtime data-feed room. */
const DATA_FEED_ROLES = new Set([
  "Super Admin",
  "Admin",
  "Sales Manager",
  "Sales Executive",
  "CRM Manager",
]);

@WebSocketGateway({
  cors: {
    origin: getCorsOrigins(),
    credentials: true,
  },
  namespace: "/events",
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token =
        (client.handshake.auth?.["token"] as string) ??
        (client.handshake.headers.authorization?.replace("Bearer ", "") ?? "");

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<JwtPayload>(token);
      if (!payload.tenantId || !payload.userId) {
        client.disconnect();
        return;
      }

      client.data.user = payload;
      // Tenant-scoped rooms only — never join another tenant's room.
      await client.join(`tenant:${payload.tenantId}`);
      await client.join(`user:${payload.userId}`);
      this.logger.log(`Client connected: ${payload.userId}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const user = client.data.user as JwtPayload | undefined;
    if (user) {
      this.logger.log(`Client disconnected: ${user.userId}`);
    }
  }

  @SubscribeMessage("ping")
  handlePing(_client: Socket): { event: string; data: string } {
    return { event: "pong", data: "ok" };
  }

  @SubscribeMessage("join:data-feed")
  async handleJoinDataFeed(
    client: Socket,
  ): Promise<{ ok: boolean; error?: string }> {
    const user = client.data.user as JwtPayload | undefined;
    if (!user?.tenantId) {
      return { ok: false, error: "UNAUTHORIZED" };
    }

    const roles = user.roles ?? [];
    const allowed =
      roles.some((r) => DATA_FEED_ROLES.has(r)) ||
      (user.permissions ?? []).some(
        (p) => p === "crm:read:leads" || p === "crm:manage:leads",
      );

    if (!allowed) {
      return { ok: false, error: "FORBIDDEN" };
    }

    await client.join(`tenant:${user.tenantId}:data-feed`);
    return { ok: true };
  }
}
