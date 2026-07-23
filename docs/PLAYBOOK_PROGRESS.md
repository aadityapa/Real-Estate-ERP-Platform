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
| 4.2 Health endpoints | Done | live/ready |
| Next.js bump | Done | 15.5.21 |
| P0 Customer tenancy / LMS / RBAC / DTOs | Done | See prior commit |

## Verify

```bash
pnpm --filter @propos/frontend test
pnpm --filter @propos/backend test:cov
pnpm --filter @propos/backend exec jest --testPathPattern=auth
pnpm --filter @propos/backend exec jest --testPathPattern=permissions
pnpm --filter @propos/backend exec jest --testPathPattern="exception|upload-safety|redact|cors|request-id|pii-crypto|audit|production-secrets"
pnpm test:e2e   # requires docker-compose.full.yml on :3000/:3001
node scripts/check-prisma-migration.cjs
```

Branch protection: `docs/CI_BRANCH_PROTECTION.md`

## Remaining (playbook order)

- **3.x** Prisma tenant extension + per-tenant limits  
- **4.1 / 4.3** pino/OTel/Sentry; DR scripts  
- **5–11** Payments, GST/RERA/DPDP, perf, IaC/CD, SSO, mobile, go-live  
