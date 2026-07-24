# PropOS Playbook Progress

**Started:** 2026-07-23  
**Source:** `PropOS_Cursor_Production_Playbook.md`

## Completed

| Item | Status | Notes |
|------|--------|-------|
| `.cursorrules` | Done | Repo root |
| 0.1 Prod readiness audit | Done | `docs/PROD_READINESS_AUDIT.md` |
| 0.2 Security baseline | Done | `docs/SECURITY_BASELINE.md` |
| 1.1 Test harness + coverage | Done | factories, `test:cov` |
| 1.2 Tenant isolation suite | Done (unit) | `test/tenant-isolation.e2e-spec.ts` |
| **1.3 Frontend + E2E** | Done | Vitest/RTL + Playwright (skips if stack down); trace/video on failure |
| **1.4 CI quality gates** | Done | Parallel jobs: lint/build, backend+Postgres, frontend, prisma migration check, audit (warn), e2e (warn) |
| **2.1 Auth & session hardening** | Done | Strong password DTO; bcrypt cost 12; Session `familyId`/`revokedAt` rotation + reuse revoke; Redis lockout; `/auth/logout`, `/logout-all`, `/change-password`; JWT secrets fail-fast in prod. Migration: `20260723070000_session_refresh_rotation` |
| **2.2 Authorization / RBAC depth** | Done | Expanded `Permissions` (`module:action:resource`); seeded Super Admin maps; `@RequirePermissions` on HR (employees/attendance/leaves), CRM leads, sales bookings/payments/inventory, legal, documents, vendors (plus prior admin/finance/support); CRM object-level edit (assignee or manager / `crm:manage:leads`); PermissionsGuard + lead denial tests. No new Prisma migration (Permission/RolePermission already existed). |
| **2.3 Input / output / transport security** | Done | Helmet CSP+HSTS (prod), CORS allowlist (no `*`) + exposed `X-Request-Id`; global Throttler + stricter `@Throttle` on auth (10/min) and documents (30/min); ValidationPipe whitelist/forbid/transform; RFC-7807-style errors keeping `{ success, error }` for clients + `requestId`; request-id + redacted HTTP logs; explicit 1mb body limit; upload filename/MIME/size guards on documents; signed `/storage` URLs only (no public bucket serve). |
| **2.4 Secrets / audit / PII-at-rest** | Done | Append-only `AuditLog` + DB trigger; `AuditInterceptor` on bookings/payments/ledger/users/documents/legal (field names + value hashes only); AES-256-GCM (`PII_ENCRYPTION_KEY`) for Customer.pan, Aadhaar-last-4, Employee/Vendor.bankDetails via Prisma extension; production boot refuses placeholder JWT/storage/PII secrets. Migration: `20260723090000_audit_log_pii_protection` (deploy: `pnpm --filter @propos/backend exec prisma migrate deploy`). |
| **3.1 Tenant scoping structurally** | Done | `TenantContext` (ALS) + interceptor from JWT; Prisma `tenant-scope` extension composed with PII extension; direct-tenant model list + global allowlist + relation-scoped docs (`docs/TENANT_ISOLATION.md`); opt-in Postgres RLS migration `20260723140000_tenant_rls_opt_in` (no-op until `app.propos_rls=on`); enforced-client lint test. |
| **3.2 Per-tenant limits & fairness** | Done | Plan defaults (STARTER/GROWTH/ENTERPRISE) + `TenantLimits` overrides; Redis per-tenant API RPM (`TenantRateLimitGuard`); seats/storage enforcement on user/document create; BullMQ `propos-tenant-jobs` + Redis concurrency semaphore; admin `GET/PATCH /admin/usage`; k6 `scripts/k6/tenant-fairness.js`; docs `docs/TENANT_LIMITS.md`. Migration: `20260723160000_tenant_limits` (`prisma migrate deploy` when DB up). |
| **4.1 Structured logging / tracing / metrics** | Done | pino JSON via nestjs-pino (`requestId`+`tenantId` mixin, PII/secret redact); OTel OTLP (`OTEL_ENABLED`, HTTP/Prisma/Redis auto + BullMQ spans); Prometheus `GET /metrics` (`METRICS_ENABLED`+`METRICS_TOKEN`); Sentry/GlitchTip backend + Next.js (DSN opt-in, tenant tags, PII scrub). Docs: `docs/OBSERVABILITY.md`. |
| **4.2 Health endpoints** | Done | live/ready |
| **4.3 Backups, DR & data lifecycle** | Done | RPO 15m / RTO 4h; `scripts/backup.sh` + `restore.sh` + `verify-restore.sh`; S3 lifecycle JSON; tenant `GET/DELETE /admin/lifecycle` (export + hard-delete with S3/local purge + AuditLog erasure GUC). Docs: `docs/DR_RUNBOOK.md`. Migration: `20260723180000_audit_log_erasure_allow` (`prisma migrate deploy` when DB up). |
| **5.1 Razorpay integration** | Done | Provider interface + `RazorpayGateway`; orders/confirm/webhook/refund/reconciliation under `/sales/payments/gateway`; money as BIGINT paise; webhook HMAC + event-id idempotency; capture → installment → receipt → ledger. Migration: `20260723190000_razorpay_gateway` (`prisma migrate deploy` when DB up). Env: `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET`. |
| **5.2 Subscription billing & plan limits** | Done | Plan entitlements (seats/projects/storage/RPM/features) + SaaS `Subscription`/`SaasInvoice` (paise); Razorpay Subscriptions gateway; `/billing/*` + webhook dunning/trial/proration; `FeatureFlagsGuard`; seat/project enforcement with `PLAN_LIMIT_EXCEEDED`; MRR/churn analytics events; frontend spec `docs/BILLING_ADMIN_PAGE.md` + `docs/BILLING.md`. Migration: `20260723200000_saas_subscription_billing` (`prisma migrate deploy` when DB up). |
| **6.1 GST e-invoicing & TDS** | Done | `GSTInvoice` (paise, HSN/SAC, CGST/SGST/IGST by place-of-supply, statutory numbering) + mock IRP (`GstIrpProvider` / `MockIrpAdapter`) storing IRN+signed QR; `TdsEntry` + quarterly return export; GSTR-1 sales register; SaaS invoice → GST link when `PROPOS_SUPPLIER_GSTIN` set. Docs: `docs/GST_EINVOICING.md`. Migration: `20260723210000_gst_einvoice_tds` (`prisma migrate deploy` when DB up). |
| **6.2 RERA, agreements & e-sign** | Done | `ReraProjectProfile` + `ReraPaymentStage` (bps caps; rule engine in `rera-rules.ts`); template-driven allotment/ATS PDF → document vault versioning; pluggable `ESignProvider` (mock Digio default; webhook → audit). Docs: `docs/RERA_AGREEMENTS_ESIGN.md`. Migration: `20260723220000_rera_agreements_esign` (`prisma migrate deploy` when DB up). |
| **6.3 DPDP Act 2023 / data residency** | Done | `ConsentPurpose` + `CustomerConsent` + `DataSubjectRequest`; customer export/correct/erase under `/privacy/*`; residency guards (`DATA_RESIDENCY_REGION`/`AWS_REGION` → `ap-south-1`); docs `docs/DPDP_COMPLIANCE.md`. Migration: `20260723230000_dpdp_consent_residency` (`prisma migrate deploy` when DB up). |
| **7.1 Database performance** | Done | Composite Lead/FollowUp/SiteVisit/Booking/Unit indexes; CRM + LMS cursor pagination; LMS leaderboard/funnel N+1 → groupBy; Prisma `connection_limit`/`pool_timeout` + PgBouncer flag; non-prod slow-query log; docs `docs/DB_PERF.md`. Migration: `20260724100000_db_perf_indexes` (`prisma migrate deploy` when DB up). |
| **7.2 Caching, realtime & load testing** | Done | Redis `CacheService` (stampede SET NX + namespace version invalidation) on CRM dashboard, LMS KPIs, inventory availability; Socket.IO `RedisIoAdapter`; atomic LMS claim (`SET NX` + `updateMany`); tenant-scoped data-feed join auth; k6 scripts `login`/`crm-list`/`booking-create`/`realtime-feed`; docs `docs/LOAD_TEST.md`. |
| Next.js bump | Done | 15.5.21 |
| P0 Customer tenancy / LMS / RBAC / DTOs | Done | See prior commit |

## Verify

```bash
pnpm --filter @propos/frontend test
pnpm --filter @propos/backend test:cov
pnpm --filter @propos/backend exec jest --testPathPattern=auth
pnpm --filter @propos/backend exec jest --testPathPattern=permissions
pnpm --filter @propos/backend exec jest --testPathPattern="exception|upload-safety|redact|cors|request-id|pii-crypto|audit|production-secrets|tenant|limits|plan-defaults|pino|metrics|tracing|sentry|retention|storage-keys|tenant-delete|storage-purger|gateway|razorpay|money|billing|tax-compute|gst-invoice|tds.service|mock-irp|rera-rules|mock-esign|agreements.service|data-residency|privacy.service|prisma-pool|lms-dashboard|leads.service|cache.service|lms-data-feed"
pnpm test:e2e   # requires docker-compose.full.yml on :3000/:3001
node scripts/check-prisma-migration.cjs
# Load tests (k6 + full compose): see docs/LOAD_TEST.md
# DR (needs Postgres client or compose postgres):
#   ./scripts/backup.sh && ./scripts/verify-restore.sh backups/propos-*.dump
# Razorpay / SaaS billing / GST / RERA / DPDP / DB perf migrations (when Postgres up):
#   pnpm --filter @propos/backend exec prisma migrate deploy
```

Branch protection: `docs/CI_BRANCH_PROTECTION.md`

## Remaining (playbook order)

- **8.1–11** Infra/CD, SSO, mobile, go-live  
