import { UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";
import { sha256Hex } from "../../common/utils/crypto";

jest.mock("bcrypt");

type MockFn = jest.Mock;

describe("AuthService", () => {
  let service: AuthService;
  let prisma: {
    session: {
      create: MockFn;
      findUnique: MockFn;
      delete: MockFn;
      deleteMany: MockFn;
    };
    user: {
      findUniqueOrThrow: MockFn;
      findUnique: MockFn;
      update: MockFn;
    };
  };
  let jwtService: { sign: MockFn };
  let configService: { get: MockFn };
  let tabLoginsService: { getForUser: MockFn };

  const user = {
    id: "user-1",
    tenantId: "tenant-1",
    email: "a@b.com",
    firstName: "A",
    lastName: "B",
    status: "ACTIVE",
    passwordHash: "$2b$12$hashed",
    roles: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      session: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        delete: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      user: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(user),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue(user),
      },
    };
    jwtService = {
      sign: jest
        .fn()
        .mockReturnValueOnce("raw-access-token")
        .mockReturnValueOnce("raw-refresh-token"),
    };
    configService = {
      get: jest.fn((key: string) =>
        key === "JWT_REFRESH_SECRET" ? "refresh-secret" : "15m",
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
  });

  it("looks up refresh sessions by SHA-256 hash", async () => {
    prisma.session.findUnique.mockResolvedValue({
      id: "sess-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 60_000),
      user,
    });
    jwtService.sign
      .mockReset()
      .mockReturnValueOnce("raw-access-token")
      .mockReturnValueOnce("raw-refresh-token");

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

  it("login rejects missing or inactive users", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.login({ email: "x@y.com", password: "Admin@123" }),
    ).rejects.toThrow(UnauthorizedException);

    prisma.user.findUnique.mockResolvedValue({ ...user, status: "INACTIVE" });
    await expect(
      service.login({ email: "a@b.com", password: "Admin@123" }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("login rejects invalid password", async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    await expect(
      service.login({ email: "a@b.com", password: "wrong" }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("login succeeds for active user with valid password", async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwtService.sign
      .mockReset()
      .mockReturnValueOnce("access")
      .mockReturnValueOnce("refresh");

    const result = await service.login({
      email: "a@b.com",
      password: "Admin@123",
    });

    expect(result.accessToken).toBe("access");
    expect(result.refreshToken).toBe("refresh");
    expect(result.user.email).toBe("a@b.com");
    expect(prisma.user.update).toHaveBeenCalled();
  });
});
