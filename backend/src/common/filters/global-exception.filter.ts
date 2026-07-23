import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";
import type { RequestWithId } from "../middleware/request-id.middleware";

export interface ProblemErrorBody {
  success: false;
  /** RFC 7807-style fields (clients may ignore; `error` remains canonical). */
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  requestId?: string;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

function httpStatusTitle(status: number): string {
  const name = HttpStatus[status];
  if (typeof name === "string") {
    return name
      .split("_")
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(" ");
  }
  return "Error";
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId | Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = "INTERNAL_ERROR";
    let message = "An unexpected error occurred";
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        const rawMessage = resp["message"];
        if (Array.isArray(rawMessage)) {
          message = "Validation failed";
          code =
            typeof resp["code"] === "string" ? resp["code"] : "VALIDATION_ERROR";
          details = {
            ...(typeof resp["details"] === "object" && resp["details"] !== null
              ? (resp["details"] as Record<string, unknown>)
              : {}),
            messages: rawMessage,
          };
        } else {
          message =
            (typeof rawMessage === "string" ? rawMessage : undefined) ??
            exception.message;
          code =
            (typeof resp["code"] === "string" ? resp["code"] : undefined) ??
            exception.name;
          details = resp["details"] as Record<string, unknown> | undefined;
        }
      } else {
        message = String(exceptionResponse);
      }
    } else if (exception instanceof Error) {
      // Never return raw Error.message to clients — may leak DB/internal details.
      this.logger.error(exception.message, exception.stack);
      message =
        process.env["NODE_ENV"] === "production"
          ? "An unexpected error occurred"
          : exception.message;
    }

    const requestId =
      "requestId" in request && typeof request.requestId === "string"
        ? request.requestId
        : undefined;
    const instance = request.originalUrl ?? request.url;
    const title = httpStatusTitle(status);

    const body: ProblemErrorBody = {
      success: false,
      type: "about:blank",
      title,
      status,
      detail: message,
      instance,
      ...(requestId ? { requestId } : {}),
      error: { code, message, details },
    };

    if (requestId) {
      response.setHeader("x-request-id", requestId);
    }
    // Keep application/json so existing clients parse the envelope unchanged.
    response.status(status).type("application/json").json(body);
  }
}
