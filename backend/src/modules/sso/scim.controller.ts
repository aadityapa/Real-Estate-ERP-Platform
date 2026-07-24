import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UnauthorizedException,
} from "@nestjs/common";
import { IsEmail, IsOptional, IsString } from "class-validator";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { Public } from "../../common/decorators/auth.decorators";
import { PrismaService } from "../../database/prisma.service";
import { BCRYPT_COST } from "../auth/password.policy";
import { safeEqual } from "./sso.service";

class ScimUserDto {
  @IsEmail()
  userName!: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  name?: { givenName?: string; familyName?: string };

  @IsOptional()
  active?: boolean;
}

/**
 * SCIM 2.0 subset for user provisioning (Phase 9.1).
 * Auth: Bearer SCIM_TOKEN or tenant-scoped header X-SCIM-Token matching
 * env SCIM_BEARER_TOKEN (platform) — production should use per-tenant secrets.
 */
@Controller("scim/v2")
export class ScimController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get("Users")
  async listUsers(
    @Headers("authorization") auth: string | undefined,
    @Query("filter") filter: string | undefined,
    @Query("tenantId") tenantId: string,
  ) {
    this.assertScimAuth(auth);
    if (!tenantId) throw new BadRequestException("tenantId required");
    const email = this.parseEmailFilter(filter);
    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        ...(email && { email }),
      },
      take: 100,
    });
    return {
      schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
      totalResults: users.length,
      Resources: users.map((u) => this.toScim(u)),
    };
  }

  @Public()
  @Post("Users")
  async createUser(
    @Headers("authorization") auth: string | undefined,
    @Query("tenantId") tenantId: string,
    @Body() dto: ScimUserDto,
  ) {
    this.assertScimAuth(auth);
    if (!tenantId) throw new BadRequestException("tenantId required");
    const passwordHash = await bcrypt.hash(
      randomBytes(32).toString("hex"),
      BCRYPT_COST,
    );
    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: dto.userName.toLowerCase(),
        firstName: dto.name?.givenName ?? dto.displayName ?? "User",
        lastName: dto.name?.familyName ?? "",
        passwordHash,
        status: dto.active === false ? "INACTIVE" : "ACTIVE",
      },
    });
    return this.toScim(user);
  }

  @Public()
  @Get("Users/:id")
  async getUser(
    @Headers("authorization") auth: string | undefined,
    @Param("id") id: string,
    @Query("tenantId") tenantId: string,
  ) {
    this.assertScimAuth(auth);
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });
    if (!user) throw new NotFoundException();
    return this.toScim(user);
  }

  @Public()
  @Patch("Users/:id")
  @Put("Users/:id")
  async updateUser(
    @Headers("authorization") auth: string | undefined,
    @Param("id") id: string,
    @Query("tenantId") tenantId: string,
    @Body() dto: ScimUserDto,
  ) {
    this.assertScimAuth(auth);
    const existing = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException();
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name?.givenName && { firstName: dto.name.givenName }),
        ...(dto.name?.familyName && { lastName: dto.name.familyName }),
        ...(dto.active === false && { status: "INACTIVE" }),
        ...(dto.active === true && { status: "ACTIVE" }),
      },
    });
    return this.toScim(user);
  }

  @Public()
  @Delete("Users/:id")
  async deactivate(
    @Headers("authorization") auth: string | undefined,
    @Param("id") id: string,
    @Query("tenantId") tenantId: string,
  ) {
    this.assertScimAuth(auth);
    const existing = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException();
    await this.prisma.user.update({
      where: { id },
      data: { status: "INACTIVE" },
    });
    return;
  }

  private assertScimAuth(auth: string | undefined): void {
    const expected = process.env["SCIM_BEARER_TOKEN"] ?? "scim-dev-token";
    const token = auth?.replace(/^Bearer\s+/i, "") ?? "";
    if (!token || !safeEqual(token, expected)) {
      throw new UnauthorizedException("Invalid SCIM token");
    }
  }

  private parseEmailFilter(filter?: string): string | undefined {
    if (!filter) return undefined;
    const m = filter.match(/userName eq "([^"]+)"/i);
    return m?.[1]?.toLowerCase();
  }

  private toScim(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
  }) {
    return {
      schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
      id: user.id,
      userName: user.email,
      name: { givenName: user.firstName, familyName: user.lastName },
      active: user.status === "ACTIVE",
      meta: { resourceType: "User" },
    };
  }
}
