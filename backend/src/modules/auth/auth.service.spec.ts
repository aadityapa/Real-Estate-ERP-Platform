import { UnauthorizedException, HttpException, HttpStatus } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";
import { sha256Hex } from "../../common/utils/crypto";
import { BCRYPT_COST } from "./password.policy";
import { LoginLockoutService } from "./login-lockout.service";
import { RedisService } from "../../common/redis/redis.service";

jest.mock("bcrypt");

type MockFn = jest.Mock;

describe("AuthService", () => {
  let service: AuthService;
  let prisma: {
    session: {
      create: MockFn;
      findUnique: MockFn;
      update: MockFn;
      updateMany: MockFn;
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
  let loginLockout: {
    assertNotLocked: MockFn;
    recordFailure: MockFn;
    clearFailures: MockFn;
  };

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
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
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
    loginLockout = {
      assertNotLocked: jest.fn().mockResolvedValue(undefined),
      recordFailure: jest.fn().mockResolvedValue(undefined),
      clearFailures: jest.fn().mockResolvedValue(undefined),
    };

    service = new AuthService(
      prisma as never,
      jwtService as never,
      configService as never,
      tabLoginsService as never,
      loginLockout as never,
    );
  });

  it("uses bcrypt cost >= 12", () => {
    expect(BCRYPT_COST).toBeGreaterThanOrEqual(12);
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
      familyId: string;
    };
    expect(data.token).toBe(sha256Hex("raw-access-token"));
    expect(data.refreshToken).toBe(sha256Hex("raw-refresh-token"));
    expect(data.familyId).toBeTruthy();
  });

  it("looks up refresh sessions by SHA-256 hash and rotates within family", async () => {
    prisma.session.findUnique.mockResolvedValue({
      id: "sess-1",
      userId: "user-1",
      familyId: "family-1",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      ipAddress: null,
      userAgent: null,
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
    expect(prisma.session.update).toHaveBeenCalledWith({
      where: { id: "sess-1" },
      data: { revokedAt: expect.any(Date) },
    });
    const created = prisma.session.create.mock.calls[0]![0].data as {
      familyId: string;
    };
    expect(created.familyId).toBe("family-1");
  });

  it("detects refresh token reuse and revokes the session family", async () => {
    prisma.session.findUnique.mockResolvedValue({
      id: "sess-old",
      userId: "user-1",
      familyId: "family-1",
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      user,
    });

    await expect(service.refreshToken("stolen-old-refresh")).rejects.toThrow(
      UnauthorizedException,
    );
    expect(prisma.session.updateMany).toHaveBeenCalledWith({
      where: { familyId: "family-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
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
      familyId: "family-1",
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000),
      user,
    });
    await expect(service.refreshToken("raw-refresh-token")).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("logout revokes the session by hashed access token", async () => {
    await service.logout("user-1", "raw-access-token");
    expect(prisma.session.updateMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        token: sha256Hex("raw-access-token"),
        revokedAt: null,
      },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("logoutAll revokes every active session for the user", async () => {
    await service.logoutAll("user-1");
    expect(prisma.session.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("login rejects missing or inactive users and records lockout failure", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.login({ email: "x@y.com", password: "Admin@123" }),
    ).rejects.toThrow(UnauthorizedException);
    expect(loginLockout.recordFailure).toHaveBeenCalled();

    prisma.user.findUnique.mockResolvedValue({ ...user, status: "INACTIVE" });
    await expect(
      service.login({ email: "a@b.com", password: "Admin@123" }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("login rejects invalid password and records lockout failure", async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    await expect(
      service.login({ email: "a@b.com", password: "wrong" }),
    ).rejects.toThrow(UnauthorizedException);
    expect(loginLockout.recordFailure).toHaveBeenCalled();
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
    expect(loginLockout.clearFailures).toHaveBeenCalled();
  });

  it("login surfaces lockout before credential check", async () => {
    loginLockout.assertNotLocked.mockRejectedValue(
      new HttpException("locked", HttpStatus.TOO_MANY_REQUESTS),
    );
    await expect(
      service.login({ email: "a@b.com", password: "x" }),
    ).rejects.toMatchObject({ status: HttpStatus.TOO_MANY_REQUESTS });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});

describe("LoginLockoutService", () => {
  it("applies exponential backoff after N failures", async () => {
    const redis = {
      isReady: () => false,
      incr: jest.fn(),
      expire: jest.fn(),
      set: jest.fn(),
      get: jest.fn(),
      ttl: jest.fn(),
      del: jest.fn(),
    } as unknown as RedisService;

    const lockout = new LoginLockoutService(redis);
    expect(lockout.lockDurationSeconds(4)).toBe(0);
    expect(lockout.lockDurationSeconds(5)).toBe(30);
    expect(lockout.lockDurationSeconds(6)).toBe(60);
    expect(lockout.lockDurationSeconds(7)).toBe(120);

    const email = "lock@test.com";
    const ip = "1.2.3.4";

    for (let i = 0; i < 5; i++) {
      await lockout.recordFailure({ email, ipAddress: ip });
    }

    await expect(
      lockout.assertNotLocked({ email, ipAddress: ip }),
    ).rejects.toBeInstanceOf(HttpException);
  });
});
