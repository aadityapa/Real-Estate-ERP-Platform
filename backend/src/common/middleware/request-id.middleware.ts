import { randomUUID } from "crypto";
import type { Request, Response, NextFunction } from "express";

export const REQUEST_ID_HEADER = "x-request-id";

export type RequestWithId = Request & { requestId: string };

function readIncomingRequestId(req: Request): string | undefined {
  const raw = req.headers[REQUEST_ID_HEADER];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return undefined;
  const trimmed = value.trim();
  // Reject oversized / non-token ids to avoid header injection in logs.
  if (trimmed.length < 8 || trimmed.length > 128) return undefined;
  if (!/^[A-Za-z0-9._\-]+$/.test(trimmed)) return undefined;
  return trimmed;
}

/**
 * Propagate or mint `x-request-id` and attach it to the request + response.
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const requestId = readIncomingRequestId(req) ?? randomUUID();
  (req as RequestWithId).requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}
