import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { join } from "path";
import { DatabaseModule } from "./database/database.module";
import { RedisModule } from "./common/redis/redis.module";
import { PdfModule } from "./common/services/pdf.module";
import { ObservabilityModule } from "./common/observability/observability.module";
import { RequestLogContextInterceptor } from "./common/observability/request-log-context.interceptor";
import { AuthModule } from "./modules/auth/auth.module";
import { CrmModule } from "./modules/crm/crm.module";
import { SalesModule } from "./modules/sales/sales.module";
import { AdminModule } from "./modules/admin/admin.module";
import { HrModule } from "./modules/hr/hr.module";
import { ConstructionModule } from "./modules/construction/construction.module";
import { FinanceModule } from "./modules/finance/finance.module";
import { VendorsModule } from "./modules/vendors/vendors.module";
import { ProcurementModule } from "./modules/procurement/procurement.module";
import { DocumentsModule } from "./modules/documents/documents.module";
import { LegalModule } from "./modules/legal/legal.module";
import { AssetsModule } from "./modules/assets/assets.module";
import { MarketingModule } from "./modules/marketing/marketing.module";
import { ChannelPartnersModule } from "./modules/channel-partners/channel-partners.module";
import { AiModule } from "./modules/ai/ai.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { PrivacyModule } from "./modules/privacy/privacy.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { EventsModule } from "./modules/events/events.module";
import { LmsModule } from "./modules/lms/lms.module";
import { SupportModule } from "./modules/support/support.module";
import { HealthModule } from "./modules/health/health.module";
import { GraphqlFeatureModule } from "./graphql/graphql.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { TenantGuard } from "./common/guards/tenant.guard";
import { PermissionsGuard } from "./common/guards/permissions.guard";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { AuditModule } from "./common/audit/audit.module";
import { AuditInterceptor } from "./common/audit/audit.interceptor";
import { TenantContextInterceptor } from "./common/tenant/tenant-context.interceptor";
import { LimitsModule } from "./common/limits/limits.module";
import { TenantRateLimitGuard } from "./common/limits/tenant-rate-limit.guard";
import { FeatureFlagsGuard } from "./common/limits/feature-flags.guard";
import { BillingModule } from "./modules/billing/billing.module";
import { SsoModule } from "./modules/sso/sso.module";
import { PlatformModule } from "./modules/platform/platform.module";
import { PlatformApiModule } from "./modules/platform-api/platform-api.module";

@Module({
  imports: [
    ObservabilityModule,
    AuditModule,
    LimitsModule,
    ConfigModule.forRoot({ isGlobal: true }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), "src/graphql/schema.gql"),
      sortSchema: true,
      path: "/graphql",
      // Never expose schema introspection or the sandbox in production
      introspection: process.env["NODE_ENV"] !== "production",
      playground: false,
      context: ({ req }: { req: { headers: Record<string, string | string[] | undefined>; user?: unknown } }) => ({ req }),
    }),
    ThrottlerModule.forRoot([
      // Global default: 100 req/min per IP. Auth endpoints get a stricter
      // override via @Throttle in the auth controller.
      { name: "short", ttl: 60000, limit: 100 },
    ]),
    DatabaseModule,
    RedisModule,
    PdfModule,
    EventsModule,
    GraphqlFeatureModule,
    AuthModule,
    SsoModule,
    PlatformModule,
    PlatformApiModule,
    CrmModule,
    SalesModule,
    AdminModule,
    HrModule,
    ConstructionModule,
    FinanceModule,
    VendorsModule,
    ProcurementModule,
    DocumentsModule,
    LegalModule,
    AssetsModule,
    MarketingModule,
    ChannelPartnersModule,
    AiModule,
    CustomersModule,
    PrivacyModule,
    NotificationsModule,
    LmsModule,
    SupportModule,
    HealthModule,
    BillingModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: RequestLogContextInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: TenantRateLimitGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: FeatureFlagsGuard },
  ],
})
export class AppModule {}
