import { UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { sha256Hex } from "../../common/utils/crypto";

type MockFn = jest.Mock;

describe("AuthService — SHA-256 token hashing", () => {
  let service: AuthService;
  let prisma: {
    session: {
      create: MockFn;
      findUnique: MockFn;
      delete: MockFn;
      deleteMany: MockFn;
    };
    user: { findUniqueOrThrow: MockFn };
  };
  let jwtService: { sign: MockFn };
  let configService: { get: MockFn };
  let tabLoginsService: { getForUser: MockFn };

  const user = {
    id: "user-1",
    tenantId: "tenant-1",
    email: "a@b.com",
    roles: [],
  };

  beforeEach(() => {
    prisma = {
      session: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        delete: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      user: { findUniqueOrThrow: jest.fn().mockResolvedValue(user) },
    };
    jwtService = {
      sign: jest
        .fn()
        .mockReturnValueOnce("raw-access-token")
        .mockReturnValueOnce("raw-refresh-token"),
    };
    configService = {
      get: jest.fn((key: string) =>
        key === "JWT_REFRESH_SECRET" ? "refresh-secret" : undefined,
      ),
    };
    tabLoginsService = { getForUser: jest.fn().mockResolvedValue(null) };

    service = new AuthService(
      prisma as never,
      jwtService as never,
      configService as never,
      tabLoginsService as never,
    );
  });

  it("stores SHA-256 hashes of tokens, never raw tokens", async () => {
    await (
      service as unknown as {
        generateTokens: (p: unknown, id: string) => Promise<unknown>;
      }
    ).generateTokens({ userId: "user-1" }, "user-1");

    const data = prisma.session.create.mock.calls[0]![0].data as {
      token: string;
      refreshToken: string;
    };
    expect(data.token).toBe(sha256Hex("raw-access-token"));
    expect(data.refreshToken).toBe(sha256Hex("raw-refresh-token"));
    expect(data.token).not.toBe("raw-access-token");
    expect(data.refreshToken).not.toBe("raw-refresh-token");
  });

  it("looks up refresh sessions by SHA-256 hash", async () => {
    prisma.session.findUnique.mockResolvedValue({
      id: "sess-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 60_000),
      user,
    });

    await service.refreshToken("raw-refresh-token");

    expect(prisma.session.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { refreshToken: sha256Hex("raw-refresh-token") },
      }),
    );
  });

  it("rejects unknown refresh tokens", async () => {
    prisma.session.findUnique.mockResolvedValue(null);
    await expect(service.refreshToken("bogus")).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("rejects expired sessions", async () => {
    prisma.session.findUnique.mockResolvedValue({
      id: "sess-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() - 1000),
      user,
    });
    await expect(service.refreshToken("raw-refresh-token")).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("logout deletes the session by hashed access token", async () => {
    await service.logout("user-1", "raw-access-token");
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1", token: sha256Hex("raw-access-token") },
    });
  });
});
