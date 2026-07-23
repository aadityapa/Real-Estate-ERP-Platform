import { Injectable } from "@nestjs/common";
import type { PlanType } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import {
  EffectiveTenantLimits,
  LimitOverrides,
  mergePlanLimits,
} from "./plan-defaults";

export interface TenantLimitsSnapshot {
  tenantId: string;
  plan: PlanType;
  limits: EffectiveTenantLimits;
  overrides: LimitOverrides | null;
}

@Injectable()
export class TenantLimitsService {
  constructor(private readonly prisma: PrismaService) {}

  async getEffectiveLimits(tenantId: string): Promise<TenantLimitsSnapshot> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        plan: true,
        limits: {
          select: {
            apiRateLimitRpm: true,
            maxSeats: true,
            maxStorageBytes: true,
            queueConcurrency: true,
          },
        },
      },
    });

    if (!tenant) {
      // Unknown tenant: fail closed to STARTER defaults (JWT should never hit this).
      return {
        tenantId,
        plan: "STARTER",
        limits: mergePlanLimits("STARTER"),
        overrides: null,
      };
    }

    const overrides = tenant.limits
      ? {
          apiRateLimitRpm: tenant.limits.apiRateLimitRpm,
          maxSeats: tenant.limits.maxSeats,
          maxStorageBytes: tenant.limits.maxStorageBytes,
          queueConcurrency: tenant.limits.queueConcurrency,
        }
      : null;

    return {
      tenantId: tenant.id,
      plan: tenant.plan,
      limits: mergePlanLimits(tenant.plan, overrides),
      overrides,
    };
  }

  async upsertOverrides(
    tenantId: string,
    dto: LimitOverrides,
  ): Promise<TenantLimitsSnapshot> {
    await this.prisma.tenantLimits.upsert({
      where: { tenantId },
      create: {
        tenantId,
        apiRateLimitRpm: dto.apiRateLimitRpm ?? null,
        maxSeats: dto.maxSeats ?? null,
        maxStorageBytes:
          dto.maxStorageBytes != null ? BigInt(dto.maxStorageBytes) : null,
        queueConcurrency: dto.queueConcurrency ?? null,
      },
      update: {
        ...(dto.apiRateLimitRpm !== undefined
          ? { apiRateLimitRpm: dto.apiRateLimitRpm }
          : {}),
        ...(dto.maxSeats !== undefined ? { maxSeats: dto.maxSeats } : {}),
        ...(dto.maxStorageBytes !== undefined
          ? {
              maxStorageBytes:
                dto.maxStorageBytes != null
                  ? BigInt(dto.maxStorageBytes)
                  : null,
            }
          : {}),
        ...(dto.queueConcurrency !== undefined
          ? { queueConcurrency: dto.queueConcurrency }
          : {}),
      },
    });
    return this.getEffectiveLimits(tenantId);
  }
}
