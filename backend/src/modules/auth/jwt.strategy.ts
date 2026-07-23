import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import type { JwtPayload } from "@propos/shared-types";
import { assertJwtSecretsConfigured } from "./jwt-secrets";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    assertJwtSecretsConfigured({
      NODE_ENV: configService.get<string>("NODE_ENV"),
      JWT_SECRET: configService.get<string>("JWT_SECRET"),
      JWT_REFRESH_SECRET: configService.get<string>("JWT_REFRESH_SECRET"),
    });
    const secret = configService.get<string>("JWT_SECRET")!;
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    if (!payload.userId || !payload.tenantId) {
      throw new UnauthorizedException("Invalid token payload");
    }
    return payload;
  }
}
