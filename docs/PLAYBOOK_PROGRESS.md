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
| 2.3 Error leak fix | Done | Prod hides raw `Error.message` |
| 4.2 Health endpoints | Done | live/ready |
| Next.js bump | Done | 15.5.21 |
| P0 Customer tenancy / LMS / RBAC / DTOs | Done | See prior commit |

## Verify

```bash
pnpm --filter @propos/frontend test
pnpm --filter @propos/backend test:cov
pnpm --filter @propos/backend exec jest --testPathPattern=auth
pnpm test:e2e   # requires docker-compose.full.yml on :3000/:3001
node scripts/check-prisma-migration.cjs
```

Branch protection: `docs/CI_BRANCH_PROTECTION.md`

## Remaining (playbook order)

- **2.2–2.4** RBAC depth, helmet/request-id, AuditLog + PII  
- **3.x** Prisma tenant extension + per-tenant limits  
- **4.1 / 4.3** pino/OTel/Sentry; DR scripts  
- **5–11** Payments, GST/RERA/DPDP, perf, IaC/CD, SSO, mobile, go-live  
