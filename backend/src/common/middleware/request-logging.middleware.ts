import { Logger } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";
import { getTenantStore } from "../tenant/tenant-context";
import { redactHeaders } from "../utils/redact";
import type { RequestWithId } from "./request-id.middleware";

const logger = new Logger("HTTP");

/**
 * Structured access log with secrets/PII redaction. Skips noisy health/metrics.
 * Emits JSON; when nestjs-pino is wired, Nest Logger serializes via pino.
 */
export function requestLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const started = Date.now();
  const path = req.originalUrl ?? req.url;
  if (path.startsWith("/api/v1/health") || path.startsWith("/metrics")) {
    next();
    return;
  }

  res.on("finish", () => {
    const requestId = (req as RequestWithId).requestId;
    const payload = {
      requestId,
      tenantId: getTenantStore()?.tenantId,
      method: req.method,
      path,
      statusCode: res.statusCode,
      durationMs: Date.now() - started,
      ip: req.ip,
      headers: redactHeaders({
        "user-agent": req.headers["user-agent"],
        "content-type": req.headers["content-type"],
        authorization: req.headers.authorization,
        cookie: req.headers.cookie,
      }),
    };
    logger.log(payload);
  });

  next();
}
