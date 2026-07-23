import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { Observable } from "rxjs";
import type { JwtPayload } from "@propos/shared-types";
import { runWithTenantStore } from "./tenant-context";

type ReqWithUser = { user?: JwtPayload };

function extractRequest(context: ExecutionContext): ReqWithUser | undefined {
  const type = context.getType<string>();
  if (type === "http") {
    return context.switchToHttp().getRequest<ReqWithUser>();
  }
  if (type === "graphql") {
    const gqlCtx = GqlExecutionContext.create(context).getContext<{
      req?: ReqWithUser;
    }>();
    return gqlCtx.req;
  }
  return undefined;
}

/**
 * Binds JWT `tenantId` into AsyncLocalStorage for the remainder of the request
 * so the Prisma tenant extension can auto-scope queries.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const req = extractRequest(context);
    const tenantId = req?.user?.tenantId;

    if (!tenantId) {
      return next.handle();
    }

    return new Observable((subscriber) => {
      runWithTenantStore({ tenantId, bypass: false }, () => {
        next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
