import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionsGuard } from "./permissions.guard";
import { PERMISSIONS_KEY } from "../decorators/auth.decorators";
import { Permissions } from "../constants/permissions";
import type { AuthenticatedRequest } from "../decorators/current-user.decorator";
import type { JwtPayload } from "@propos/shared-types";

function mockContext(user: JwtPayload | undefined, required?: string[]) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(required),
  } as unknown as Reflector;
  const guard = new PermissionsGuard(reflector);
  const request = { user } as AuthenticatedRequest;
  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  };
  return { guard, reflector, request, context };
}

describe("PermissionsGuard", () => {
  const baseUser: JwtPayload = {
    userId: "u1",
    tenantId: "t1",
    email: "rep@demo.propos.in",
    roles: ["Sales Rep"],
    permissions: [Permissions.CRM_LEADS_READ],
  };

  it("allows when no permissions are required", () => {
    const { guard, context } = mockContext(baseUser, undefined);
    expect(guard.canActivate(context as never)).toBe(true);
  });

  it("allows when required list is empty", () => {
    const { guard, context } = mockContext(baseUser, []);
    expect(guard.canActivate(context as never)).toBe(true);
  });

  it("bypasses checks for Super Admin", () => {
    const { guard, context } = mockContext(
      {
        ...baseUser,
        roles: ["Super Admin"],
        permissions: [],
      },
      [Permissions.FINANCE_LEDGER_WRITE],
    );
    expect(guard.canActivate(context as never)).toBe(true);
  });

  it("allows when user has every required permission", () => {
    const { guard, context } = mockContext(
      {
        ...baseUser,
        permissions: [
          Permissions.FINANCE_LEDGER_READ,
          Permissions.FINANCE_LEDGER_WRITE,
        ],
      },
      [Permissions.FINANCE_LEDGER_READ, Permissions.FINANCE_LEDGER_WRITE],
    );
    expect(guard.canActivate(context as never)).toBe(true);
  });

  it("denies with 403 when user lacks a required permission", () => {
    const { guard, context } = mockContext(baseUser, [
      Permissions.FINANCE_LEDGER_WRITE,
    ]);
    expect(() => guard.canActivate(context as never)).toThrow(
      ForbiddenException,
    );
    try {
      guard.canActivate(context as never);
    } catch (err) {
      expect(err).toBeInstanceOf(ForbiddenException);
      expect((err as ForbiddenException).message).toBe(
        "Insufficient permissions",
      );
    }
  });

  it("denies when user has only a subset of required permissions", () => {
    const { guard, context } = mockContext(
      {
        ...baseUser,
        permissions: [Permissions.SALES_BOOKINGS_READ],
      },
      [Permissions.SALES_BOOKINGS_READ, Permissions.SALES_BOOKINGS_WRITE],
    );
    expect(() => guard.canActivate(context as never)).toThrow(
      ForbiddenException,
    );
  });

  it("reads metadata via PERMISSIONS_KEY", () => {
    const { guard, reflector, context } = mockContext(baseUser, [
      Permissions.HR_EMPLOYEES_WRITE,
    ]);
    expect(() => guard.canActivate(context as never)).toThrow(
      ForbiddenException,
    );
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(PERMISSIONS_KEY, [
      expect.anything(),
      expect.anything(),
    ]);
  });
});
