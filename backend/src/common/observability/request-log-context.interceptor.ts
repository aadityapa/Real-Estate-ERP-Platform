import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import { Observable } from "rxjs";
import type { RequestWithId } from "../middleware/request-id.middleware";
import { runWithRequestLogStore } from "./request-log-context";

function extractRequestId(context: ExecutionContext): string | undefined {
  const type = context.getType<string>();
  if (type === "http") {
    const req = context.switchToHttp().getRequest<RequestWithId>();
    return req?.requestId;
  }
  if (type === "graphql") {
    const gqlCtx = GqlExecutionContext.create(context).getContext<{
      req?: RequestWithId;
    }>();
    return gqlCtx.req?.requestId;
  }
  return undefined;
}

/**
 * Binds requestId into ALS for the Nest pipeline so pino mixin can attach it
 * to every log line (pairs with TenantContextInterceptor for tenantId).
 */
@Injectable()
export class RequestLogContextInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const requestId = extractRequestId(context);
    if (!requestId) {
      return next.handle();
    }

    return new Observable((subscriber) => {
      runWithRequestLogStore({ requestId }, () => {
        next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
