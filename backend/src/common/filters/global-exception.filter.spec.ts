import {
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from "@nestjs/common";
import type { ArgumentsHost } from "@nestjs/common";
import { GlobalExceptionFilter } from "./global-exception.filter";

function mockHost(overrides?: {
  requestId?: string;
  url?: string;
}): {
  host: ArgumentsHost;
  json: jest.Mock;
  status: jest.Mock;
  type: jest.Mock;
  setHeader: jest.Mock;
} {
  const json = jest.fn();
  const type = jest.fn().mockReturnThis();
  const setHeader = jest.fn();
  const status = jest.fn().mockReturnValue({ type, json, setHeader });
  const response = { status, type, json, setHeader };
  const request = {
    requestId: overrides?.requestId,
    originalUrl: overrides?.url ?? "/api/v1/leads",
    url: overrides?.url ?? "/api/v1/leads",
  };

  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;

  return { host, json, status, type, setHeader };
}

describe("GlobalExceptionFilter", () => {
  const filter = new GlobalExceptionFilter();
  const prevEnv = process.env["NODE_ENV"];

  afterEach(() => {
    process.env["NODE_ENV"] = prevEnv;
  });

  it("returns client-compatible error envelope with RFC-7807 fields and requestId", () => {
    const { host, json, status, setHeader } = mockHost({
      requestId: "req-test-123",
    });

    filter.catch(new NotFoundException("Lead not found"), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(setHeader).toHaveBeenCalledWith("x-request-id", "req-test-123");
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        type: "about:blank",
        title: "Not Found",
        status: 404,
        detail: "Lead not found",
        instance: "/api/v1/leads",
        requestId: "req-test-123",
        error: expect.objectContaining({
          message: "Lead not found",
        }),
      }),
    );
  });

  it("normalizes ValidationPipe-style array messages", () => {
    const { host, json } = mockHost({ requestId: "req-val" });
    const ex = new BadRequestException({
      message: ["name should not be empty", "email must be an email"],
      error: "Bad Request",
      statusCode: 400,
    });

    filter.catch(ex, host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        detail: "Validation failed",
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: {
            messages: ["name should not be empty", "email must be an email"],
          },
        },
      }),
    );
  });

  it("hides raw Error.message in production", () => {
    process.env["NODE_ENV"] = "production";
    const { host, json } = mockHost({ requestId: "req-prod" });

    filter.catch(new Error("relation \"User\" does not exist"), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        status: 500,
        detail: "An unexpected error occurred",
        error: expect.objectContaining({
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        }),
      }),
    );
  });

  it("preserves HttpException status codes", () => {
    const { host, status } = mockHost();
    filter.catch(
      new HttpException({ code: "LOCKED", message: "Too many attempts" }, 429),
      host,
    );
    expect(status).toHaveBeenCalledWith(429);
  });
});
