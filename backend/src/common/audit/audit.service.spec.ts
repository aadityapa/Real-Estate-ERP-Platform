import {
  AuditService,
  changedFieldNames,
  hashAuditSnapshot,
} from "./audit.service";
import { AuditInterceptor } from "./audit.interceptor";
import { of } from "rxjs";
import type { CallHandler, ExecutionContext } from "@nestjs/common";

describe("audit.service hashing", () => {
  it("never embeds raw PII in the snapshot hash inputs result", () => {
    const { hash, fieldNames } = hashAuditSnapshot({
      status: "CANCELLED",
      pan: "ABCDE1234F",
      email: "buyer@example.com",
    });
    expect(fieldNames).toEqual(["email", "pan", "status"]);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain("ABCDE");
    expect(JSON.stringify({ hash, fieldNames })).not.toMatch(/buyer@/);
  });

  it("detects changed field names without values", () => {
    expect(
      changedFieldNames(
        { status: "BOOKED", discountAmount: 0 },
        { status: "CANCELLED", discountAmount: 0 },
      ),
    ).toEqual(["status"]);
  });

  it("writes an AuditLog row scoped by tenantId", async () => {
    const create = jest.fn().mockResolvedValue({ id: "a1" });
    const prisma = { auditLog: { create } } as never;
    const service = new AuditService(prisma);

    await service.record({
      tenantId: "t1",
      actorId: "u1",
      action: "UPDATE",
      entity: "Booking",
      entityId: "b1",
      before: { status: "BOOKED" },
      after: { status: "CANCELLED", cancelReason: "customer request" },
      ip: "127.0.0.1",
      userAgent: "jest",
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "t1",
        actorId: "u1",
        action: "UPDATE",
        entity: "Booking",
        entityId: "b1",
        changedFields: ["cancelReason", "status"],
        ip: "127.0.0.1",
      }),
    });
    const data = create.mock.calls[0][0].data as {
      beforeHash: string;
      afterHash: string;
      changedFields: string[];
    };
    expect(data.beforeHash).toMatch(/^[a-f0-9]{64}$/);
    expect(data.afterHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(data)).not.toMatch(/customer request/);
  });
});

describe("AuditInterceptor", () => {
  it("records Booking UPDATE on PATCH /sales/bookings/:id", (done) => {
    const record = jest.fn().mockResolvedValue(undefined);
    const interceptor = new AuditInterceptor({ record } as never);

    const req = {
      method: "PATCH",
      originalUrl: "/api/v1/sales/bookings/bk_1",
      url: "/api/v1/sales/bookings/bk_1",
      params: { id: "bk_1" },
      body: { status: "CANCELLED" },
      user: { userId: "u1", tenantId: "t1" },
      ip: "10.0.0.1",
      headers: { "user-agent": "jest-agent" },
      socket: { remoteAddress: "10.0.0.1" },
    };

    const context = {
      getType: () => "http",
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;

    const handler: CallHandler = {
      handle: () => of({ id: "bk_1", status: "CANCELLED" }),
    };

    interceptor.intercept(context, handler).subscribe({
      next: () => {
        expect(record).toHaveBeenCalledWith(
          expect.objectContaining({
            tenantId: "t1",
            actorId: "u1",
            action: "UPDATE",
            entity: "Booking",
            entityId: "bk_1",
            after: { status: "CANCELLED" },
          }),
        );
        done();
      },
      error: done.fail,
    });
  });

  it("skips non-sensitive routes", (done) => {
    const record = jest.fn();
    const interceptor = new AuditInterceptor({ record } as never);
    const context = {
      getType: () => "http",
      switchToHttp: () => ({
        getRequest: () => ({
          method: "POST",
          originalUrl: "/api/v1/health",
          url: "/api/v1/health",
          body: {},
          user: { tenantId: "t1" },
          headers: {},
        }),
      }),
    } as unknown as ExecutionContext;

    interceptor.intercept(context, { handle: () => of({}) }).subscribe({
      next: () => {
        expect(record).not.toHaveBeenCalled();
        done();
      },
      error: done.fail,
    });
  });
});
