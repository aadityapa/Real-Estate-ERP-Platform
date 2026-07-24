import { createHmac, randomBytes } from "crypto";
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { sha256 } from "../sso/sso.service";

export const WEBHOOK_EVENTS = [
  "lead.created",
  "booking.confirmed",
  "payment.captured",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    name: string,
    scopes: string[],
    createdById?: string,
  ) {
    const raw = `pos_${randomBytes(24).toString("hex")}`;
    const prefix = raw.slice(0, 12);
    const keyHash = sha256(raw);
    const row = await this.prisma.apiKey.create({
      data: {
        tenantId,
        name,
        keyHash,
        prefix,
        scopes,
        createdById,
      },
    });
    return {
      id: row.id,
      name: row.name,
      prefix: row.prefix,
      scopes: row.scopes,
      /** Shown once — store securely; never logged. */
      secret: raw,
      createdAt: row.createdAt,
    };
  }

  async list(tenantId: string) {
    return this.prisma.apiKey.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async rotate(tenantId: string, id: string, createdById?: string) {
    const existing = await this.prisma.apiKey.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException("API key not found");
    await this.prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    return this.create(tenantId, existing.name, existing.scopes, createdById);
  }

  async revoke(tenantId: string, id: string) {
    const existing = await this.prisma.apiKey.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException("API key not found");
    return this.prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async authenticate(
    rawKey: string,
    requiredScope?: string,
  ): Promise<{ tenantId: string; scopes: string[]; keyId: string }> {
    const keyHash = sha256(rawKey);
    const row = await this.prisma.apiKey.findUnique({ where: { keyHash } });
    if (!row || row.revokedAt) {
      throw new UnauthorizedException("Invalid API key");
    }
    if (row.expiresAt && row.expiresAt < new Date()) {
      throw new UnauthorizedException("API key expired");
    }
    if (requiredScope && !row.scopes.includes(requiredScope) && !row.scopes.includes("*")) {
      throw new ForbiddenException(`Missing scope: ${requiredScope}`);
    }
    await this.prisma.apiKey.update({
      where: { id: row.id },
      data: { lastUsedAt: new Date() },
    });
    return { tenantId: row.tenantId, scopes: row.scopes, keyId: row.id };
  }
}

@Injectable()
export class WebhooksService {
  constructor(private readonly prisma: PrismaService) {}

  async createEndpoint(
    tenantId: string,
    url: string,
    events: string[],
  ) {
    const secret = `whsec_${randomBytes(24).toString("hex")}`;
    return this.prisma.webhookEndpoint.create({
      data: { tenantId, url, secret, events },
    });
  }

  async listEndpoints(tenantId: string) {
    return this.prisma.webhookEndpoint.findMany({
      where: { tenantId },
      select: {
        id: true,
        url: true,
        events: true,
        enabled: true,
        createdAt: true,
        // secret omitted from list
      },
    });
  }

  async listDeliveries(tenantId: string, endpointId: string) {
    const ep = await this.prisma.webhookEndpoint.findFirst({
      where: { id: endpointId, tenantId },
    });
    if (!ep) throw new NotFoundException("Endpoint not found");
    return this.prisma.webhookDelivery.findMany({
      where: { endpointId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  signPayload(secret: string, body: string, timestamp: number): string {
    return createHmac("sha256", secret)
      .update(`${timestamp}.${body}`)
      .digest("hex");
  }

  /**
   * Dispatch event to all matching tenant endpoints.
   * Retries: marks nextRetryAt on failure (worker can pick up later).
   */
  async dispatch(
    tenantId: string,
    event: WebhookEvent,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const endpoints = await this.prisma.webhookEndpoint.findMany({
      where: {
        tenantId,
        enabled: true,
        events: { has: event },
      },
    });
    const body = JSON.stringify({ event, data: payload, tenantId });
    const payloadHash = sha256(body);
    const ts = Math.floor(Date.now() / 1000);

    for (const ep of endpoints) {
      const sig = this.signPayload(ep.secret, body, ts);
      let success = false;
      let statusCode: number | null = null;
      let lastError: string | null = null;
      try {
        const res = await fetch(ep.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-PropOS-Signature": sig,
            "X-PropOS-Timestamp": String(ts),
            "X-PropOS-Event": event,
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });
        statusCode = res.status;
        success = res.ok;
        if (!success) lastError = `HTTP ${res.status}`;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }

      await this.prisma.webhookDelivery.create({
        data: {
          endpointId: ep.id,
          event,
          payloadHash,
          statusCode,
          success,
          attempts: 1,
          lastError,
          nextRetryAt: success
            ? null
            : new Date(Date.now() + 60_000),
        },
      });
    }
  }

  async retryDelivery(deliveryId: string): Promise<boolean> {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      include: { endpoint: true },
    });
    if (!delivery || delivery.success) return false;
    const ep = delivery.endpoint;
    // Re-dispatch minimal payload (hash-only stored) — production should store encrypted body
    const body = JSON.stringify({
      event: delivery.event,
      retry: true,
      deliveryId,
    });
    const ts = Math.floor(Date.now() / 1000);
    const sig = this.signPayload(ep.secret, body, ts);
    try {
      const res = await fetch(ep.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PropOS-Signature": sig,
          "X-PropOS-Timestamp": String(ts),
          "X-PropOS-Event": delivery.event,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          attempts: { increment: 1 },
          statusCode: res.status,
          success: res.ok,
          lastError: res.ok ? null : `HTTP ${res.status}`,
          nextRetryAt: res.ok ? null : new Date(Date.now() + 5 * 60_000),
        },
      });
      return res.ok;
    } catch (err) {
      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          attempts: { increment: 1 },
          lastError: err instanceof Error ? err.message : String(err),
          nextRetryAt: new Date(Date.now() + 5 * 60_000),
        },
      });
      return false;
    }
  }
}
