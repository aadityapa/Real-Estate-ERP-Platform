import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ScimController } from "./scim.controller";
import { SsoController } from "./sso.controller";
import { SsoService } from "./sso.service";

@Module({
  imports: [AuthModule],
  controllers: [SsoController, ScimController],
  providers: [SsoService],
  exports: [SsoService],
})
export class SsoModule {}
