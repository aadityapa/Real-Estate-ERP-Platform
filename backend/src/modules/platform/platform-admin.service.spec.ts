import { PlatformAdminService } from "./platform-admin.service";

describe("PlatformAdminService impersonation", () => {
  let prisma: {
    user: { findFirst: jest.Mock };
    impersonationSession: { create: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
  };
  let audit: { record: jest.Mock };
  let service: PlatformAdminService;

  beforeEach(() => {
    prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: "target",
          email: "admin@tenant.com",
          roles: [{ role: { name: "Admin" } }],
        }),
      },
      impersonationSession: {
        create: jest.fn().mockResolvedValue({
          id: "sess1",
          expiresAt: new Date(Date.now() + 3600_000),
        }),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new PlatformAdminService(prisma as never, audit as never);
  });

  it("starts impersonation and writes audit row", async () => {
    const result = await service.startImpersonation("actor", "t1", "target");
    expect(result.sessionId).toBe("sess1");
    expect(result.banner).toContain("audited");
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CREATE",
        entity: "ImpersonationSession",
        tenantId: "t1",
        actorId: "actor",
      }),
    );
  });
});
