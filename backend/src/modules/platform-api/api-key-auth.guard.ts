import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiKeysService } from "./api-keys.service";

/**
 * Optional API-key auth via `Authorization: Bearer pos_…` or `X-API-Key`.
 * Attaches `request.apiKey` and synthesizes a minimal `request.user` for tenant scoping.
 */
@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(private readonly keys: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: { tenantId: string; userId: string; roles: string[]; permissions: string[]; email: string };
      apiKey?: { keyId: string; scopes: string[] };
    }>();

    const header =
      req.headers["x-api-key"] ??
      (req.headers.authorization?.startsWith("Bearer pos_")
        ? req.headers.authorization.slice(7)
        : undefined);

    if (!header) {
      throw new UnauthorizedException("API key required");
    }

    const auth = await this.keys.authenticate(header);
    req.apiKey = { keyId: auth.keyId, scopes: auth.scopes };
    req.user = {
      tenantId: auth.tenantId,
      userId: `apikey:${auth.keyId}`,
      email: `apikey:${auth.keyId}@system`,
      roles: [],
      permissions: auth.scopes,
    };
    return true;
  }
}
