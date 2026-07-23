import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { FEATURES_KEY } from "../decorators/auth.decorators";
import { AuthenticatedRequest } from "../decorators/current-user.decorator";
import { IS_PUBLIC_KEY } from "../decorators/auth.decorators";
import type { PlanFeature } from "./plan-defaults";
import { PLAN_LIMIT_ERROR } from "./tenant-usage.service";
import { TenantLimitsService } from "./tenant-limits.service";

/**
 * Enforces @RequireFeatures(...) against the tenant's effective plan entitlements.
 * No-op when the decorator is absent. Runs after JWT/Tenant guards.
 */
@Injectable()
export class FeatureFlagsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly limits: TenantLimitsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const required = this.reflector.getAllAndOverride<PlanFeature[]>(
      FEATURES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const tenantId = request.user?.tenantId;
    if (!tenantId) {
      throw new ForbiddenException("Tenant context required for feature check");
    }

    const snapshot = await this.limits.getEffectiveLimits(tenantId);
    const missing = required.filter((f) => !snapshot.limits.features[f]);
    if (missing.length) {
      throw new ForbiddenException({
        code: PLAN_LIMIT_ERROR,
        limit: "features",
        plan: snapshot.plan,
        missing,
        message: `Feature(s) not included on ${snapshot.plan}: ${missing.join(", ")}. Upgrade plan to unlock.`,
      });
    }
    return true;
  }
}
