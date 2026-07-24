import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { IsBoolean, IsEmail, IsOptional, IsString } from "class-validator";
import { Public } from "../../common/decorators/auth.decorators";
import { SsoService } from "./sso.service";

class OidcCallbackDto {
  @IsString()
  tenantSlug!: string;

  @IsEmail()
  email!: string;

  @IsString()
  sub!: string;

  @IsOptional()
  @IsString()
  given_name?: string;

  @IsOptional()
  @IsString()
  family_name?: string;

  @IsOptional()
  groups?: string[];
}

class SamlAcsDto {
  @IsString()
  tenantSlug!: string;

  @IsString()
  assertion!: string;

  @IsOptional()
  @IsBoolean()
  mock?: boolean;
}

@Controller("auth/sso")
export class SsoController {
  constructor(private readonly sso: SsoService) {}

  @Public()
  @Get(":tenantSlug/config")
  config(@Param("tenantSlug") tenantSlug: string) {
    return this.sso.getIdpConfig(tenantSlug);
  }

  @Public()
  @Post("oidc/callback")
  oidc(@Body() dto: OidcCallbackDto) {
    return this.sso.handleOidcCallback({
      tenantSlug: dto.tenantSlug,
      claims: {
        sub: dto.sub,
        email: dto.email,
        given_name: dto.given_name,
        family_name: dto.family_name,
        groups: dto.groups,
      },
    });
  }

  @Public()
  @Post("saml/acs")
  saml(@Body() dto: SamlAcsDto) {
    return this.sso.handleSamlAssertion({
      tenantSlug: dto.tenantSlug,
      assertionXmlOrJson: dto.assertion,
      mock: dto.mock,
    });
  }
}
