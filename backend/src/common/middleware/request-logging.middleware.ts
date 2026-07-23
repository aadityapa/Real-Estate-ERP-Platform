import { Logger } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";
import { redactHeaders } from "../utils/redact";
import type { RequestWithId } from "./request-id.middleware";

const logger = new Logger("HTTP");

/**
 * Structured access log with secrets/PII redaction. Skips noisy health probes.
 */
export function requestLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const started = Date.now();
  const path = req.originalUrl ?? req.url;
  if (path.startsWith("/api/v1/health")) {
    next();
    return;
  }

  res.on("finish", () => {
    const requestId = (req as RequestWithId).requestId;
    const payload = {
      requestId,
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
    logger.log(JSON.stringify(payload));
  });

  next();
}
