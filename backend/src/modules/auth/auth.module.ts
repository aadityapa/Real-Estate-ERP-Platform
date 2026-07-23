import { Module } from "@nestjs/common";
import { JwtModule, JwtSignOptions } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./jwt.strategy";
import { TabLoginsModule } from "../admin/tab-logins/tab-logins.module";
import { LoginLockoutService } from "./login-lockout.service";
import { assertJwtSecretsConfigured } from "./jwt-secrets";

@Module({
  imports: [
    TabLoginsModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        assertJwtSecretsConfigured({
          NODE_ENV: configService.get<string>("NODE_ENV"),
          JWT_SECRET: configService.get<string>("JWT_SECRET"),
          JWT_REFRESH_SECRET: configService.get<string>("JWT_REFRESH_SECRET"),
        });
        const secret = configService.get<string>("JWT_SECRET")!;
        return {
          secret,
          signOptions: {
            expiresIn: (configService.get<string>("JWT_EXPIRES_IN") ??
              "15m") as JwtSignOptions["expiresIn"],
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LoginLockoutService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
