import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import type { Request } from "express";
import type { JwtPayload } from "@propos/shared-types";
import { AuditService, type AuditAction } from "./audit.service";

interface SensitiveRoute {
  match: RegExp;
  entity: string;
  /** Param name for entity id when present. */
  idParam?: string;
}

/**
 * Mutating routes that must emit AuditLog rows (bookings, payments, ledger,
 * users, documents, legal).
 */
export const SENSITIVE_AUDIT_ROUTES: SensitiveRoute[] = [
  { match: /^\/api\/v1\/sales\/bookings(?:\/|$)/, entity: "Booking", idParam: "id" },
  { match: /^\/api\/v1\/sales\/payments\/gateway(?:\/|$)/, entity: "GatewayPayment", idParam: "id" },
  { match: /^\/api\/v1\/sales\/payments(?:\/|$)/, entity: "Payment", idParam: "id" },
  { match: /^\/api\/v1\/finance\/ledger(?:\/|$)/, entity: "LedgerEntry", idParam: "id" },
  { match: /^\/api\/v1\/admin\/users(?:\/|$)/, entity: "User", idParam: "id" },
  { match: /^\/api\/v1\/documents(?:\/|$)/, entity: "Document", idParam: "id" },
  { match: /^\/api\/v1\/legal(?:\/|$)/, entity: "LegalCase", idParam: "id" },
];

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function actionFromMethod(method: string): AuditAction {
  if (method === "DELETE") return "DELETE";
  if (method === "POST") return "CREATE";
  return "UPDATE";
}

function resolveEntityId(
  req: Request,
  idParam: string | undefined,
  data: unknown,
): string | undefined {
  if (idParam && req.params?.[idParam]) {
    return String(req.params[idParam]);
  }
  if (data && typeof data === "object" && data !== null && "id" in data) {
    const id = (data as { id?: unknown }).id;
    if (typeof id === "string") return id;
  }
  return undefined;
}

function asFieldMap(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  return body as Record<string, unknown>;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<
      Request & { user?: JwtPayload }
    >();
    const method = (req.method ?? "GET").toUpperCase();
    if (!MUTATING.has(method)) {
      return next.handle();
    }

    const path = req.originalUrl?.split("?")[0] ?? req.url?.split("?")[0] ?? "";
    const route = SENSITIVE_AUDIT_ROUTES.find((r) => r.match.test(path));
    if (!route) {
      return next.handle();
    }

    const afterFields = asFieldMap(req.body);
    const action = actionFromMethod(method);

    return next.handle().pipe(
      tap((responseBody) => {
        const tenantId = req.user?.tenantId;
        if (!tenantId) return;

        const data =
          responseBody &&
          typeof responseBody === "object" &&
          "data" in (responseBody as object)
            ? (responseBody as { data: unknown }).data
            : responseBody;

        const entityId = resolveEntityId(req, route.idParam, data);

        void this.audit.record({
          tenantId,
          actorId: req.user?.userId,
          action,
          entity: route.entity,
          entityId,
          // Before state is not loaded here; hash of request body stands as after.
          // UPDATE with empty body still records action + entityId.
          before: action === "CREATE" ? null : null,
          after: afterFields,
          ip: req.ip ?? req.socket?.remoteAddress ?? null,
          userAgent: req.headers["user-agent"] ?? null,
        });
      }),
    );
  }
}
