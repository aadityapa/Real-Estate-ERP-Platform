import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";
import type { JwtPayload } from "@propos/shared-types";

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (data) {
      return request.user[data];
    }
    return request.user;
  },
);

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user.tenantId;
  },
);
