import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

/**
 * Runtime feature flags (Phase 9.2). Tenant-specific overrides global.
 * Wire modules with: `if (await flags.isEnabled(tenantId, 'lms_clash')) ...`
 */
@Injectable()
export class FeatureFlagService {
  constructor(private readonly prisma: PrismaService) {}

  async isEnabled(tenantId: string, key: string): Promise<boolean> {
    const tenantFlag = await this.prisma.featureFlag.findFirst({
      where: { key, tenantId },
    });
    if (tenantFlag) return tenantFlag.enabled;
    const global = await this.prisma.featureFlag.findFirst({
      where: { key, tenantId: null },
    });
    return global?.enabled ?? false;
  }
}
