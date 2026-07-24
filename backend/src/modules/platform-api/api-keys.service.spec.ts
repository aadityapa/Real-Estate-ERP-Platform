import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { ApiKeysService, WebhooksService } from "./api-keys.service";

describe("ApiKeysService", () => {
  let prisma: {
    apiKey: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
  };
  let service: ApiKeysService;

  beforeEach(() => {
    prisma = {
      apiKey: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: "k1",
            ...data,
            createdAt: new Date(),
          }),
        ),
        findUnique: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };
    service = new ApiKeysService(prisma as never);
  });

  it("create returns secret once and stores hash", async () => {
    const created = await service.create("t1", "ci", ["crm:read:leads"]);
    expect(created.secret).toMatch(/^pos_/);
    expect(prisma.apiKey.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "t1",
          keyHash: expect.any(String),
          prefix: expect.stringMatching(/^pos_/),
        }),
      }),
    );
  });

  it("authenticate enforces scope", async () => {
    const created = await service.create("t1", "ci", ["crm:read:leads"]);
    const hash = (prisma.apiKey.create.mock.calls[0][0] as { data: { keyHash: string } })
      .data.keyHash;
    prisma.apiKey.findUnique.mockResolvedValue({
      id: "k1",
      tenantId: "t1",
      keyHash: hash,
      scopes: ["crm:read:leads"],
      revokedAt: null,
      expiresAt: null,
    });
    prisma.apiKey.update.mockResolvedValue({});

    await expect(
      service.authenticate(created.secret, "crm:read:leads"),
    ).resolves.toMatchObject({ tenantId: "t1" });

    await expect(
      service.authenticate(created.secret, "sales:write:bookings"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects revoked keys", async () => {
    prisma.apiKey.findUnique.mockResolvedValue({
      id: "k1",
      revokedAt: new Date(),
      scopes: ["*"],
    });
    await expect(service.authenticate("pos_x")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

describe("WebhooksService signing", () => {
  it("signs timestamp.payload with HMAC-SHA256", () => {
    const prisma = {
      webhookEndpoint: { findMany: jest.fn(), create: jest.fn(), findFirst: jest.fn() },
      webhookDelivery: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    };
    const svc = new WebhooksService(prisma as never);
    const sig = svc.signPayload("whsec_test", '{"a":1}', 1700000000);
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
    const sig2 = svc.signPayload("whsec_test", '{"a":1}', 1700000000);
    expect(sig).toBe(sig2);
    expect(svc.signPayload("whsec_other", '{"a":1}', 1700000000)).not.toBe(sig);
  });
});
