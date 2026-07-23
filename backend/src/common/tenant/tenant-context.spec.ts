import {
  TenantContext,
  getTenantStore,
  runWithTenantStore,
} from "./tenant-context";

describe("TenantContext", () => {
  const ctx = new TenantContext();

  it("exposes tenantId inside runWithTenant", () => {
    expect(ctx.getTenantId()).toBeUndefined();
    ctx.runWithTenant("tenant-a", () => {
      expect(ctx.getTenantId()).toBe("tenant-a");
      expect(ctx.isBypassed()).toBe(false);
      expect(getTenantStore()?.tenantId).toBe("tenant-a");
    });
    expect(ctx.getTenantId()).toBeUndefined();
  });

  it("runAsSystem sets bypass", () => {
    ctx.runAsSystem(() => {
      expect(ctx.isBypassed()).toBe(true);
      expect(ctx.getTenantId()).toBeUndefined();
    });
  });

  it("propagates across async boundaries", async () => {
    await ctx.runWithTenant("tenant-b", async () => {
      await Promise.resolve();
      expect(getTenantStore()?.tenantId).toBe("tenant-b");
    });
  });

  it("runWithTenantStore accepts explicit store", () => {
    runWithTenantStore({ tenantId: "t1", bypass: false }, () => {
      expect(getTenantStore()).toEqual({ tenantId: "t1", bypass: false });
    });
  });
});
