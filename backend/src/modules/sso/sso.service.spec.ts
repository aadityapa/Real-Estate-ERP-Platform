import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { SsoService } from "./sso.service";

describe("SsoService", () => {
  let prisma: {
    tenant: { findUnique: jest.Mock };
    tenantIdpConfig: { findFirst: jest.Mock };
    user: { findUnique: jest.Mock; create: jest.Mock };
    role: { findFirst: jest.Mock };
  };
  let auth: { issueTokensForUser: jest.Mock };
  let service: SsoService;

  beforeEach(() => {
    prisma = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue({
          id: "t1",
          slug: "acme",
          status: "ACTIVE",
          ssoOnly: false,
        }),
      },
      tenantIdpConfig: {
        findFirst: jest.fn().mockResolvedValue({
          id: "idp1",
          protocol: "saml",
          roleMapping: { Admins: "Admin", default: "Sales Executive" },
          certificate: null,
          enabled: true,
        }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: "u1",
          email: "a@acme.com",
          tenantId: "t1",
        }),
      },
      role: {
        findFirst: jest.fn().mockResolvedValue({ id: "r1", name: "Admin" }),
      },
    };
    auth = {
      issueTokensForUser: jest.fn().mockResolvedValue({
        accessToken: "a",
        refreshToken: "r",
        expiresIn: "15m",
        user: { id: "u1" },
      }),
    };
    service = new SsoService(prisma as never, auth as never);
  });

  it("JIT provisions from mock SAML assertion and issues JWT", async () => {
    const result = await service.handleSamlAssertion({
      tenantSlug: "acme",
      mock: true,
      assertionXmlOrJson: JSON.stringify({
        email: "a@acme.com",
        nameId: "nid-1",
        firstName: "Ada",
        lastName: "Lovelace",
        groups: ["Admins"],
        signatureOk: true,
      }),
    });
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "t1",
          email: "a@acme.com",
          firstName: "Ada",
        }),
      }),
    );
    expect(auth.issueTokensForUser).toHaveBeenCalledWith("u1");
    expect(result.accessToken).toBe("a");
  });

  it("rejects bad SAML signature when not mock", async () => {
    prisma.tenantIdpConfig.findFirst.mockResolvedValue({
      protocol: "saml",
      roleMapping: {},
      certificate: null,
      enabled: true,
    });
    await expect(
      service.handleSamlAssertion({
        tenantSlug: "acme",
        assertionXmlOrJson: "<Assertion></Assertion>",
        mock: false,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("OIDC callback maps claims to tokens", async () => {
    prisma.tenantIdpConfig.findFirst.mockResolvedValue({
      protocol: "oidc",
      roleMapping: { default: "Sales Executive" },
      enabled: true,
    });
    prisma.user.findUnique.mockResolvedValue({
      id: "u2",
      tenantId: "t1",
      status: "ACTIVE",
      email: "b@acme.com",
    });
    await service.handleOidcCallback({
      tenantSlug: "acme",
      claims: { sub: "oidc-1", email: "b@acme.com", given_name: "Bob" },
    });
    expect(auth.issueTokensForUser).toHaveBeenCalledWith("u2");
  });

  it("assertPasswordLoginAllowed blocks ssoOnly tenants", async () => {
    prisma.tenant.findUnique.mockResolvedValue({ ssoOnly: true });
    await expect(service.assertPasswordLoginAllowed("t1")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
