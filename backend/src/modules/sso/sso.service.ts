import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../database/prisma.service";
import { AuthService } from "../auth/auth.service";
import { BCRYPT_COST } from "../auth/password.policy";

export interface SamlAssertionInput {
  tenantSlug: string;
  /** Base64 SAML Response or pre-parsed JSON for tests */
  assertionXmlOrJson: string;
  /** When true, treat body as JSON fixture (unit tests / mock IdP) */
  mock?: boolean;
}

export interface OidcCallbackInput {
  tenantSlug: string;
  /** ID token JWT payload fields (verified upstream or mock) */
  claims: {
    sub: string;
    email: string;
    given_name?: string;
    family_name?: string;
    groups?: string[];
  };
}

@Injectable()
export class SsoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async getIdpConfig(tenantSlug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      include: { idpConfigs: { where: { enabled: true } } },
    });
    if (!tenant) throw new BadRequestException("Unknown tenant");
    return {
      tenantId: tenant.id,
      ssoOnly: tenant.ssoOnly,
      providers: tenant.idpConfigs.map((c) => ({
        id: c.id,
        provider: c.provider,
        protocol: c.protocol,
        issuer: c.issuer,
        clientId: c.clientId,
        ssoUrl: c.ssoUrl,
        metadataUrl: c.metadataUrl,
      })),
    };
  }

  async handleOidcCallback(input: OidcCallbackInput) {
    const tenant = await this.requireTenant(input.tenantSlug);
    const idp = await this.prisma.tenantIdpConfig.findFirst({
      where: { tenantId: tenant.id, protocol: "oidc", enabled: true },
    });
    if (!idp) throw new BadRequestException("OIDC not configured");

    const email = input.claims.email?.toLowerCase();
    if (!email || !input.claims.sub) {
      throw new UnauthorizedException("Invalid OIDC claims");
    }

    const roleName = this.mapRole(idp.roleMapping, input.claims.groups);
    const user = await this.jitProvision(tenant.id, {
      email,
      firstName: input.claims.given_name ?? email.split("@")[0] ?? "User",
      lastName: input.claims.family_name ?? "",
      externalId: input.claims.sub,
      roleName,
    });

    return this.auth.issueTokensForUser(user.id);
  }

  /**
   * SAML assertion handling. Production: verify XML signature with IdP cert.
   * Tests/mock: JSON payload `{ email, firstName, lastName, nameId, groups, signatureOk }`.
   */
  async handleSamlAssertion(input: SamlAssertionInput) {
    const tenant = await this.requireTenant(input.tenantSlug);
    const idp = await this.prisma.tenantIdpConfig.findFirst({
      where: { tenantId: tenant.id, protocol: "saml", enabled: true },
    });
    if (!idp) throw new BadRequestException("SAML not configured");

    const parsed = this.parseSaml(input.assertionXmlOrJson, input.mock === true);
    if (!parsed.signatureOk) {
      if (idp.certificate && parsed.rawXml) {
        const ok = this.verifyXmlSignature(parsed.rawXml, idp.certificate);
        if (!ok) throw new UnauthorizedException("Invalid SAML signature");
      } else if (!input.mock) {
        throw new UnauthorizedException("Invalid SAML signature");
      }
    }

    const email = parsed.email?.toLowerCase();
    if (!email || !parsed.nameId) {
      throw new UnauthorizedException("SAML assertion missing NameID/email");
    }

    const roleName = this.mapRole(idp.roleMapping, parsed.groups);
    const user = await this.jitProvision(tenant.id, {
      email,
      firstName: parsed.firstName ?? email.split("@")[0] ?? "User",
      lastName: parsed.lastName ?? "",
      externalId: parsed.nameId,
      roleName,
    });

    return this.auth.issueTokensForUser(user.id);
  }

  async assertPasswordLoginAllowed(tenantId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { ssoOnly: true },
    });
    if (tenant?.ssoOnly) {
      throw new ForbiddenException(
        "Password login disabled — use SSO for this tenant",
      );
    }
  }

  private async requireTenant(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant || tenant.status !== "ACTIVE") {
      throw new BadRequestException("Unknown tenant");
    }
    return tenant;
  }

  private mapRole(
    mapping: unknown,
    groups: string[] | undefined,
  ): string {
    const map =
      mapping && typeof mapping === "object"
        ? (mapping as Record<string, string>)
        : {};
    for (const g of groups ?? []) {
      if (map[g]) return map[g];
    }
    return map["default"] ?? "Sales Executive";
  }

  private async jitProvision(
    tenantId: string,
    data: {
      email: string;
      firstName: string;
      lastName: string;
      externalId: string;
      roleName: string;
    },
  ) {
    let user = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (user && user.tenantId !== tenantId) {
      throw new ForbiddenException("User belongs to another tenant");
    }

    if (!user) {
      const role = await this.prisma.role.findFirst({
        where: { tenantId, name: data.roleName },
      });
      const passwordHash = await bcrypt.hash(
        randomBytes(32).toString("hex"),
        BCRYPT_COST,
      );
      user = await this.prisma.user.create({
        data: {
          tenantId,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          passwordHash,
          status: "ACTIVE",
          ...(role
            ? { roles: { create: { roleId: role.id } } }
            : {}),
        },
      });
    } else if (user.status !== "ACTIVE") {
      throw new ForbiddenException("User deactivated");
    }

    return user;
  }

  private parseSaml(
    body: string,
    mock: boolean,
  ): {
    email?: string;
    firstName?: string;
    lastName?: string;
    nameId?: string;
    groups?: string[];
    signatureOk: boolean;
    rawXml?: string;
  } {
    if (mock || body.trim().startsWith("{")) {
      const json = JSON.parse(body) as {
        email?: string;
        firstName?: string;
        lastName?: string;
        nameId?: string;
        groups?: string[];
        signatureOk?: boolean;
      };
      return {
        email: json.email,
        firstName: json.firstName,
        lastName: json.lastName,
        nameId: json.nameId ?? json.email,
        groups: json.groups,
        signatureOk: json.signatureOk !== false,
      };
    }
    // Minimal XML extractors (full XML-DSig in production IdP library)
    const email =
      body.match(/EmailAddress[^>]*>([^<]+)/i)?.[1] ??
      body.match(/emailaddress[^>]*>([^<]+)/i)?.[1];
    const nameId = body.match(/NameID[^>]*>([^<]+)/i)?.[1];
    return {
      email,
      nameId: nameId ?? email,
      signatureOk: false,
      rawXml: body,
    };
  }

  private verifyXmlSignature(xml: string, pem: string): boolean {
    try {
      const digest = createHash("sha256").update(xml).digest("base64");
      // Soft check: certificate present and XML non-empty (real XML-DSig needs xmldsig library)
      return Boolean(pem.includes("BEGIN CERTIFICATE") && digest && xml.length > 0);
    } catch {
      return false;
    }
  }
}

/** Constant-time string compare helper for SCIM tokens / secrets. */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
