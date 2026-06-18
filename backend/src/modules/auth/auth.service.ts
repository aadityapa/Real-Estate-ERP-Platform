import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../database/prisma.service";
import { TabLoginsService } from "../admin/tab-logins/tab-logins.service";
import { LoginDto, RegisterDto } from "./dto/auth.dto";
import type { JwtPayload } from "@propos/shared-types";

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

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tabLoginsService: TabLoginsService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokens & { user: AuthUserResponse }> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new UnauthorizedException("Email already registered");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

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
    const tokens = await this.generateTokens(payload, user.id);

    return {
      ...tokens,
      user: this.mapUserResponse(payload, user),
    };
  }

  async login(dto: LoginDto): Promise<AuthTokens & { user: AuthUserResponse }> {
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
      throw new UnauthorizedException("Invalid credentials");
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload = await this.buildJwtPayload(user.id);
    const tokens = await this.generateTokens(payload, user.id);

    return {
      ...tokens,
      user: this.mapUserResponse(payload, user),
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const payload = await this.buildJwtPayload(session.userId);
    await this.prisma.session.delete({ where: { id: session.id } });

    return this.generateTokens(payload, session.userId);
  }

  async logout(userId: string, token: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { userId, token },
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

    await this.prisma.session.create({
      data: {
        userId,
        token: accessToken,
        refreshToken,
        expiresAt,
      },
    });

    return { accessToken, refreshToken, expiresIn };
  }

  private mapUserResponse(
    payload: JwtPayload,
    user: { id: string; email: string; firstName: string; lastName: string; tenantId: string },
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
