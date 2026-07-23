import {
  Injectable,
  UnauthorizedException,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { sha256Hex } from "../../common/utils/crypto";
import { PrismaService } from "../../database/prisma.service";
import { TabLoginsService } from "../admin/tab-logins/tab-logins.service";
import {
  ChangePasswordDto,
  LoginDto,
  RegisterDto,
} from "./dto/auth.dto";
import type { JwtPayload } from "@propos/shared-types";
import { BCRYPT_COST } from "./password.policy";
import { LoginLockoutService } from "./login-lockout.service";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthUserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
  allowedTabs?: string[];
  defaultTab?: string;
  tabId?: string;
}

export interface AuthRequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tabLoginsService: TabLoginsService,
    private readonly loginLockout: LoginLockoutService,
  ) {}

  async register(
    dto: RegisterDto,
    meta: AuthRequestMeta = {},
  ): Promise<AuthTokens & { user: AuthUserResponse }> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new UnauthorizedException("Email already registered");
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);

    const { user } = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.tenantName,
          slug: dto.tenantSlug,
        },
      });

      const role = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: "Super Admin",
          description: "Full system access",
          isSystem: true,
        },
      });

      const createdUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          roles: {
            create: { roleId: role.id },
          },
        },
      });

      return { tenant, user: createdUser };
    });

    const payload = await this.buildJwtPayload(user.id);
    const tokens = await this.generateTokens(payload, user.id, meta);

    return {
      ...tokens,
      user: this.mapUserResponse(payload, user),
    };
  }

  async login(
    dto: LoginDto,
    meta: AuthRequestMeta = {},
  ): Promise<AuthTokens & { user: AuthUserResponse }> {
    const attempt = { email: dto.email, ipAddress: meta.ipAddress };
    await this.loginLockout.assertNotLocked(attempt);

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!user || user.status !== "ACTIVE") {
      await this.loginLockout.recordFailure(attempt);
      throw new UnauthorizedException("Invalid credentials");
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      await this.loginLockout.recordFailure(attempt);
      throw new UnauthorizedException("Invalid credentials");
    }

    await this.loginLockout.clearFailures(attempt);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload = await this.buildJwtPayload(user.id);
    const tokens = await this.generateTokens(payload, user.id, meta);

    return {
      ...tokens,
      user: this.mapUserResponse(payload, user),
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const hash = sha256Hex(refreshToken);
    const session = await this.prisma.session.findUnique({
      where: { refreshToken: hash },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    // Reuse of a rotated/revoked refresh token → revoke the whole family.
    if (session.revokedAt) {
      await this.revokeSessionFamily(session.familyId);
      this.logger.warn(
        `Refresh token reuse detected for family ${session.familyId}`,
      );
      throw new UnauthorizedException("Refresh token reuse detected");
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (session.user.status !== "ACTIVE") {
      await this.revokeSessionFamily(session.familyId);
      throw new UnauthorizedException("Invalid refresh token");
    }

    // Mark current session revoked (keep hash for reuse detection), then issue new.
    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const payload = await this.buildJwtPayload(session.userId);
    return this.generateTokens(
      payload,
      session.userId,
      {
        ipAddress: session.ipAddress ?? undefined,
        userAgent: session.userAgent ?? undefined,
      },
      session.familyId,
    );
  }

  async logout(userId: string, accessToken: string): Promise<void> {
    const now = new Date();
    await this.prisma.session.updateMany({
      where: {
        userId,
        token: sha256Hex(accessToken),
        revokedAt: null,
      },
      data: { revokedAt: now },
    });
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        "New password must be different from the current password",
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_COST);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    // Force re-login everywhere after a password change.
    await this.logoutAll(userId);
  }

  private async revokeSessionFamily(familyId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async buildJwtPayload(userId: string): Promise<JwtPayload> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    const roles = user.roles.map((ur) => ur.role.name);
    const permissions = user.roles.flatMap((ur) =>
      ur.role.permissions.map(
        (rp) => `${rp.permission.module}:${rp.permission.action}:${rp.permission.resource}`,
      ),
    );

    const tabConfig = await this.tabLoginsService.getForUser(userId);

    // Keep existing JwtPayload shape (userId, not sub) so clients don't break.
    return {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      roles: [...new Set(roles)],
      permissions: [...new Set(permissions)],
      ...(tabConfig && {
        allowedTabs: tabConfig.allowedTabs,
        defaultTab: tabConfig.defaultTab,
        tabId: tabConfig.tabId,
      }),
    };
  }

  private async generateTokens(
    payload: JwtPayload,
    userId: string,
    meta: AuthRequestMeta = {},
    familyId?: string,
  ): Promise<AuthTokens> {
    const refreshSecret = this.configService.get<string>("JWT_REFRESH_SECRET");
    if (!refreshSecret) {
      throw new Error("JWT_REFRESH_SECRET is not configured");
    }

    const accessToken = this.jwtService.sign({ ...payload });
    const refreshToken = this.jwtService.sign(
      { ...payload },
      {
        secret: refreshSecret,
        expiresIn: (this.configService.get<string>("JWT_REFRESH_EXPIRES_IN") ??
          "30d") as JwtSignOptions["expiresIn"],
      },
    );

    const expiresIn = this.configService.get<string>("JWT_EXPIRES_IN") ?? "15m";
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Store SHA-256 hashes only — a DB leak must not expose usable tokens.
    await this.prisma.session.create({
      data: {
        userId,
        familyId: familyId ?? randomBytes(16).toString("hex"),
        token: sha256Hex(accessToken),
        refreshToken: sha256Hex(refreshToken),
        expiresAt,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });

    return { accessToken, refreshToken, expiresIn };
  }

  private mapUserResponse(
    payload: JwtPayload,
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      tenantId: string;
    },
  ): AuthUserResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      tenantId: user.tenantId,
      roles: payload.roles,
      permissions: payload.permissions,
      allowedTabs: payload.allowedTabs,
      defaultTab: payload.defaultTab,
      tabId: payload.tabId,
    };
  }
}
