import { BadRequestException, NotFoundException } from "@nestjs/common";
import { LifecycleService } from "./lifecycle.service";

describe("LifecycleService", () => {
  const tenant = {
    id: "t1",
    name: "Acme",
    slug: "acme",
    plan: "STARTER",
    status: "ACTIVE",
    createdAt: new Date("2026-01-01"),
  };

  function build(overrides: {
    findUnique?: jest.Mock;
    transaction?: jest.Mock;
  }) {
    const prisma = {
      tenant: { findUnique: overrides.findUnique ?? jest.fn() },
      user: { findMany: jest.fn(), count: jest.fn() },
      customer: { findMany: jest.fn(), count: jest.fn() },
      company: { findMany: jest.fn(), count: jest.fn() },
      document: { findMany: jest.fn(), count: jest.fn() },
      documentVersion: { findMany: jest.fn() },
      lead: { findMany: jest.fn(), count: jest.fn() },
      vendor: { findMany: jest.fn(), count: jest.fn() },
      auditLog: { count: jest.fn() },
      $transaction: overrides.transaction ?? jest.fn(),
    };
    const tenantContext = {
      runAsSystem: <T>(fn: () => T): T => fn(),
    };
    const storagePurger = {
      purge: jest.fn().mockResolvedValue({
        deleted: [],
        failed: [],
        deferredS3Keys: [],
      }),
    };
    const service = new LifecycleService(
      prisma as never,
      tenantContext as never,
      storagePurger as never,
    );
    return { service, prisma, storagePurger };
  }

  it("rejects hard-delete when slug does not match", async () => {
    const { service } = build({
      findUnique: jest.fn().mockResolvedValue(tenant),
    });
    await expect(service.hardDeleteTenant("t1", "wrong")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("404 when tenant missing", async () => {
    const { service } = build({
      findUnique: jest.fn().mockResolvedValue(null),
    });
    await expect(service.hardDeleteTenant("t1", "acme")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("runs delete steps then purges storage on confirm", async () => {
    const transaction = jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        $executeRaw: jest.fn(),
        $executeRawUnsafe: jest.fn(),
      };
      return fn(tx);
    });
    const { service, prisma, storagePurger } = build({
      findUnique: jest.fn().mockResolvedValue(tenant),
      transaction,
    });
    prisma.document.findMany.mockResolvedValue([
      { fileUrl: "/storage/a.pdf" },
    ]);
    prisma.documentVersion.findMany.mockResolvedValue([]);

    const result = await service.hardDeleteTenant("t1", "acme");
    expect(transaction).toHaveBeenCalled();
    expect(result.steps[result.steps.length - 1]).toBe("tenant");
    expect(storagePurger.purge).toHaveBeenCalled();
  });
});
