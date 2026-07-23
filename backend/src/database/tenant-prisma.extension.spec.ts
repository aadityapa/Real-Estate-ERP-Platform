import {
  injectTenantIntoData,
  mergeTenantWhere,
  requireTenantIdOnWrite,
  stripTenantIdReassignment,
  TenantScopeError,
} from "./tenant-prisma.extension";
import {
  DIRECT_TENANT_MODELS,
  GLOBAL_MODELS,
  isDirectTenantModel,
  isGlobalModel,
} from "./tenant-models";

describe("tenant scope helpers", () => {
  it("mergeTenantWhere injects tenantId", () => {
    expect(mergeTenantWhere({ id: "1" }, "t-a")).toEqual({
      id: "1",
      tenantId: "t-a",
    });
  });

  it("mergeTenantWhere rejects conflicting tenantId", () => {
    expect(() => mergeTenantWhere({ tenantId: "t-b" }, "t-a")).toThrow(
      TenantScopeError,
    );
  });

  it("injectTenantIntoData sets and rejects mismatch", () => {
    expect(injectTenantIntoData({ name: "x" }, "t-a")).toEqual({
      name: "x",
      tenantId: "t-a",
    });
    expect(() =>
      injectTenantIntoData({ tenantId: "t-b" }, "t-a"),
    ).toThrow(TenantScopeError);
  });

  it("requireTenantIdOnWrite rejects missing tenantId", () => {
    expect(() => requireTenantIdOnWrite({ name: "x" }, "Lead")).toThrow(
      TenantScopeError,
    );
    expect(() =>
      requireTenantIdOnWrite({ tenantId: "t-a", name: "x" }, "Lead"),
    ).not.toThrow();
  });

  it("stripTenantIdReassignment blocks cross-tenant reassignment", () => {
    expect(stripTenantIdReassignment({ status: "ACTIVE" }, "t-a")).toEqual({
      status: "ACTIVE",
    });
    expect(() =>
      stripTenantIdReassignment({ tenantId: "t-b" }, "t-a"),
    ).toThrow(TenantScopeError);
  });
});

describe("tenant model classification", () => {
  it("marks Lead/Customer as direct-tenant and Tenant/Permission as global", () => {
    expect(isDirectTenantModel("Lead")).toBe(true);
    expect(isDirectTenantModel("Customer")).toBe(true);
    expect(isGlobalModel("Tenant")).toBe(true);
    expect(isGlobalModel("Permission")).toBe(true);
    expect(isDirectTenantModel("Tenant")).toBe(false);
    expect(DIRECT_TENANT_MODELS.length).toBeGreaterThan(10);
    expect(GLOBAL_MODELS).toEqual([
      "Tenant",
      "Permission",
      "ConsentPurpose",
      "GatewayWebhookEvent",
    ]);
  });
});
