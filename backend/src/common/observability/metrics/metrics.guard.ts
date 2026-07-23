import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request } from "express";
import { MetricsService } from "./metrics.service";

/**
 * Internal-only scrape gate: METRICS_ENABLED must be on and Authorization
 * Bearer (or ?token=) must match METRICS_TOKEN. Missing token → 401.
 * Disabled → 404 (hide the endpoint).
 */
@Injectable()
export class MetricsAuthGuard implements CanActivate {
  constructor(private readonly metrics: MetricsService) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.metrics.isEnabled()) {
      throw new NotFoundException();
    }
    const expected = this.metrics.getAccessToken();
    if (!expected) {
      throw new UnauthorizedException("METRICS_TOKEN not configured");
    }

    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization;
    const bearer =
      typeof header === "string" && header.toLowerCase().startsWith("bearer ")
        ? header.slice(7).trim()
        : undefined;
    const queryToken =
      typeof req.query["token"] === "string"
        ? req.query["token"]
        : undefined;
    const provided = bearer || queryToken;
    if (!provided || provided !== expected) {
      throw new UnauthorizedException("Invalid metrics token");
    }
    return true;
  }
}
