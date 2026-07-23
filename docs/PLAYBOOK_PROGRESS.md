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
| Next.js bump | Done | 15.5.21 |
| P0 Customer tenancy / LMS / RBAC / DTOs | Done | See prior commit |

## Verify

```bash
pnpm --filter @propos/frontend test
pnpm --filter @propos/backend test:cov
pnpm --filter @propos/backend exec jest --testPathPattern=auth
pnpm --filter @propos/backend exec jest --testPathPattern=permissions
pnpm --filter @propos/backend exec jest --testPathPattern="exception|upload-safety|redact|cors|request-id|pii-crypto|audit|production-secrets|tenant|limits|plan-defaults|pino|metrics|tracing|sentry|retention|storage-keys|tenant-delete|storage-purger|gateway|razorpay|money|billing"
pnpm test:e2e   # requires docker-compose.full.yml on :3000/:3001
node scripts/check-prisma-migration.cjs
# DR (needs Postgres client or compose postgres):
#   ./scripts/backup.sh && ./scripts/verify-restore.sh backups/propos-*.dump
# Razorpay / SaaS billing migrations (when Postgres up):
#   pnpm --filter @propos/backend exec prisma migrate deploy
```

Branch protection: `docs/CI_BRANCH_PROTECTION.md`

## Remaining (playbook order)

- **6.1–11** GST/RERA/DPDP, perf, IaC/CD, SSO, mobile, go-live  
