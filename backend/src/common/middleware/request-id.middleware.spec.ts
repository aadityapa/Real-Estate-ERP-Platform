import type { Request, Response } from "express";
import {
  REQUEST_ID_HEADER,
  requestIdMiddleware,
  type RequestWithId,
} from "./request-id.middleware";

describe("requestIdMiddleware", () => {
  it("propagates a valid incoming x-request-id", () => {
    const req = {
      headers: { [REQUEST_ID_HEADER]: "client-req-abc-123" },
    } as unknown as Request;
    const setHeader = jest.fn();
    const res = { setHeader } as unknown as Response;
    const next = jest.fn();

    requestIdMiddleware(req, res, next);

    expect((req as RequestWithId).requestId).toBe("client-req-abc-123");
    expect(setHeader).toHaveBeenCalledWith(
      REQUEST_ID_HEADER,
      "client-req-abc-123",
    );
    expect(next).toHaveBeenCalled();
  });

  it("mints a uuid when header is missing", () => {
    const req = { headers: {} } as unknown as Request;
    const setHeader = jest.fn();
    const res = { setHeader } as unknown as Response;
    const next = jest.fn();

    requestIdMiddleware(req, res, next);

    const id = (req as RequestWithId).requestId;
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, id);
  });
});
