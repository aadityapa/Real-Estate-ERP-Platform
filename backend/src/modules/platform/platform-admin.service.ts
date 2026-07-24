import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { AuditService } from "../../common/audit/audit.service";

const IMPERSONATION_TTL_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class PlatformAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listTenants() {
    return this.prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        status: true,
        ssoOnly: true,
        createdAt: true,
        _count: { select: { users: true } },
        limits: true,
        subscriptions: {
          where: { status: { in: ["ACTIVE", "TRIAL", "PAST_DUE"] } },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async updateTenant(
    id: string,
    data: { plan?: "STARTER" | "GROWTH" | "ENTERPRISE"; status?: "ACTIVE" | "INACTIVE" | "ARCHIVED"; ssoOnly?: boolean },
  ) {
    return this.prisma.tenant.update({ where: { id }, data });
  }

  async listAuditLogs(tenantId: string | undefined, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 200),
      select: {
        id: true,
        tenantId: true,
        actorId: true,
        action: true,
        entity: true,
        entityId: true,
        changedFields: true,
        createdAt: true,
        // never expose beforeHash/afterHash value contents beyond hashes — hashes OK
        beforeHash: true,
        afterHash: true,
      },
    });
  }

  async listFlags(tenantId?: string) {
    return this.prisma.featureFlag.findMany({
      where: tenantId ? { OR: [{ tenantId }, { tenantId: null }] } : undefined,
      orderBy: { key: "asc" },
    });
  }

  async upsertFlag(input: {
    key: string;
    enabled: boolean;
    tenantId?: string | null;
    description?: string;
  }) {
    const existing = await this.prisma.featureFlag.findFirst({
      where: {
        key: input.key,
        tenantId: input.tenantId ?? null,
      },
    });
    if (existing) {
      return this.prisma.featureFlag.update({
        where: { id: existing.id },
        data: {
          enabled: input.enabled,
          description: input.description ?? existing.description,
        },
      });
    }
    return this.prisma.featureFlag.create({
      data: {
        key: input.key,
        enabled: input.enabled,
        tenantId: input.tenantId ?? null,
        description: input.description,
      },
    });
  }

  async isFlagEnabled(tenantId: string, key: string): Promise<boolean> {
    const tenantFlag = await this.prisma.featureFlag.findFirst({
      where: { key, tenantId },
    });
    if (tenantFlag) return tenantFlag.enabled;
    const global = await this.prisma.featureFlag.findFirst({
      where: { key, tenantId: null },
    });
    return global?.enabled ?? false;
  }

  async startImpersonation(actorUserId: string, tenantId: string, targetUserId: string) {
    const target = await this.prisma.user.findFirst({
      where: { id: targetUserId, tenantId },
      include: { roles: { include: { role: true } } },
    });
    if (!target) throw new NotFoundException("Target user not found");
    const isAdmin = target.roles.some((r) =>
      ["Super Admin", "Admin"].includes(r.role.name),
    );
    if (!isAdmin) {
      throw new BadRequestException("Can only impersonate tenant admins");
    }

    const session = await this.prisma.impersonationSession.create({
      data: {
        tenantId,
        actorUserId,
        targetUserId,
        expiresAt: new Date(Date.now() + IMPERSONATION_TTL_MS),
      },
    });

    await this.audit.record({
      tenantId,
      actorId: actorUserId,
      action: "CREATE",
      entity: "ImpersonationSession",
      entityId: session.id,
      after: { targetUserId, expiresAt: session.expiresAt.toISOString() },
    });

    return {
      sessionId: session.id,
      tenantId,
      targetUserId,
      expiresAt: session.expiresAt,
      banner: `Viewing as tenant admin ${target.email} — actions are audited`,
    };
  }

  async endImpersonation(actorUserId: string, sessionId: string) {
    const session = await this.prisma.impersonationSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.actorUserId !== actorUserId) {
      throw new ForbiddenException("Invalid impersonation session");
    }
    await this.prisma.impersonationSession.update({
      where: { id: sessionId },
      data: { endedAt: new Date() },
    });
    await this.audit.record({
      tenantId: session.tenantId,
      actorId: actorUserId,
      action: "UPDATE",
      entity: "ImpersonationSession",
      entityId: sessionId,
      before: { endedAt: null },
      after: { endedAt: new Date().toISOString() },
    });
    return { ok: true };
  }

  async assertActiveImpersonation(sessionId: string, actorUserId: string) {
    const session = await this.prisma.impersonationSession.findUnique({
      where: { id: sessionId },
    });
    if (
      !session ||
      session.actorUserId !== actorUserId ||
      session.endedAt ||
      session.expiresAt < new Date()
    ) {
      throw new ForbiddenException("Impersonation expired or invalid");
    }
    return session;
  }
}
