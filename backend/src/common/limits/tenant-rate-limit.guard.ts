import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";
import type { JwtPayload } from "@propos/shared-types";
import { IS_PUBLIC_KEY } from "../decorators/auth.decorators";
import { TenantLimitsService } from "./tenant-limits.service";
import { TenantUsageService } from "./tenant-usage.service";

type ReqWithUser = { user?: JwtPayload };

/**
 * Per-tenant API rate limit (plan RPM + overrides). Runs after JWT/Tenant guards.
 * IP throttling remains on the global ThrottlerGuard.
 */
@Injectable()
export class TenantRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(TenantRateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly limits: TenantLimitsService,
    private readonly usage: TenantUsageService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const tenantId = this.extractTenantId(context);
    if (!tenantId) {
      return true;
    }

    const { limits } = await this.limits.getEffectiveLimits(tenantId);
    const count = await this.usage.recordApiCall(tenantId);

    if (count > limits.apiRateLimitRpm) {
      this.logger.warn(
        `Tenant ${tenantId} exceeded API rate limit (${limits.apiRateLimitRpm}/min)`,
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: "Tenant rate limit exceeded. Retry later.",
          retryAfterSeconds: 60,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private extractTenantId(context: ExecutionContext): string | undefined {
    const type = context.getType<string>();
    let req: ReqWithUser | undefined;
    if (type === "http") {
      req = context.switchToHttp().getRequest<ReqWithUser>();
    } else if (type === "graphql") {
      req = GqlExecutionContext.create(context).getContext<{
        req?: ReqWithUser;
      }>().req;
    }
    return req?.user?.tenantId;
  }
}
