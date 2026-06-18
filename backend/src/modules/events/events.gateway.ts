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
      client.data.user = payload;
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
  handlePing(client: Socket): { event: string; data: string } {
    return { event: "pong", data: "ok" };
  }

  @SubscribeMessage("join:data-feed")
  async handleJoinDataFeed(client: Socket): Promise<void> {
    const user = client.data.user as JwtPayload | undefined;
    if (user) {
      await client.join(`tenant:${user.tenantId}:data-feed`);
    }
  }
}
