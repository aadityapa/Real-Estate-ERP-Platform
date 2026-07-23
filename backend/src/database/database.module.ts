import { Global, Module } from "@nestjs/common";
import { TenantContext } from "../common/tenant/tenant-context";
import { TenantContextInterceptor } from "../common/tenant/tenant-context.interceptor";
import { PrismaService } from "./prisma.service";

@Global()
@Module({
  providers: [PrismaService, TenantContext, TenantContextInterceptor],
  exports: [PrismaService, TenantContext, TenantContextInterceptor],
})
export class DatabaseModule {}
