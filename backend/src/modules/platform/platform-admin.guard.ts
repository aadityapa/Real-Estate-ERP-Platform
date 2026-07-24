import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { AuthenticatedRequest } from "../../common/decorators/current-user.decorator";

/**
 * Platform (Nexovo) operators only — not tenant Super Admins.
 * Allowlist emails via PLATFORM_ADMIN_EMAILS (comma-separated).
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const email = req.user?.email?.toLowerCase();
    if (!email) throw new ForbiddenException("Platform admin required");

    const allow = (process.env["PLATFORM_ADMIN_EMAILS"] ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    // Dev fallback: Super Admin role when allowlist empty (non-production)
    if (allow.length === 0) {
      if (process.env["NODE_ENV"] === "production") {
        throw new ForbiddenException("PLATFORM_ADMIN_EMAILS not configured");
      }
      const roles = req.user?.roles ?? [];
      if (!roles.includes("Super Admin")) {
        throw new ForbiddenException("Platform admin required");
      }
      return true;
    }

    if (!allow.includes(email)) {
      throw new ForbiddenException("Platform admin required");
    }
    return true;
  }
}
