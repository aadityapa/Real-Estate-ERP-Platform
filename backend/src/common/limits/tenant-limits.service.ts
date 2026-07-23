import { Injectable } from "@nestjs/common";
import { Prisma, type PlanType } from "@prisma/client";
import { PrismaService } from "../../database/prisma.service";
import {
  EffectiveTenantLimits,
  LimitOverrides,
  PLAN_FEATURES,
  type PlanFeature,
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
            maxProjects: true,
            maxStorageBytes: true,
            queueConcurrency: true,
            featureFlags: true,
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
          maxProjects: tenant.limits.maxProjects,
          maxStorageBytes: tenant.limits.maxStorageBytes,
          queueConcurrency: tenant.limits.queueConcurrency,
          featureFlags: parseFeatureFlags(tenant.limits.featureFlags),
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
    const featureFlagsJson =
      dto.featureFlags === undefined
        ? undefined
        : dto.featureFlags === null
          ? Prisma.DbNull
          : (dto.featureFlags as Prisma.InputJsonValue);

    await this.prisma.tenantLimits.upsert({
      where: { tenantId },
      create: {
        tenantId,
        apiRateLimitRpm: dto.apiRateLimitRpm ?? null,
        maxSeats: dto.maxSeats ?? null,
        maxProjects: dto.maxProjects ?? null,
        maxStorageBytes:
          dto.maxStorageBytes != null ? BigInt(dto.maxStorageBytes) : null,
        queueConcurrency: dto.queueConcurrency ?? null,
        ...(featureFlagsJson !== undefined
          ? { featureFlags: featureFlagsJson }
          : {}),
      },
      update: {
        ...(dto.apiRateLimitRpm !== undefined
          ? { apiRateLimitRpm: dto.apiRateLimitRpm }
          : {}),
        ...(dto.maxSeats !== undefined ? { maxSeats: dto.maxSeats } : {}),
        ...(dto.maxProjects !== undefined
          ? { maxProjects: dto.maxProjects }
          : {}),
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
        ...(featureFlagsJson !== undefined
          ? { featureFlags: featureFlagsJson }
          : {}),
      },
    });
    return this.getEffectiveLimits(tenantId);
  }
}

function parseFeatureFlags(
  raw: unknown,
): Partial<Record<PlanFeature, boolean>> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Partial<Record<PlanFeature, boolean>> = {};
  const obj = raw as Record<string, unknown>;
  for (const key of PLAN_FEATURES) {
    if (typeof obj[key] === "boolean") out[key] = obj[key];
  }
  return Object.keys(out).length ? out : null;
}
