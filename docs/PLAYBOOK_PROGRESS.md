# PropOS Playbook Progress

**Started:** 2026-07-23  
**Source:** `PropOS_Cursor_Production_Playbook.md`

## Completed this session

| Item | Status | Notes |
|------|--------|-------|
| `.cursorrules` | Done | Repo root |
| 0.1 Prod readiness audit | Done | `docs/PROD_READINESS_AUDIT.md` |
| 0.2 Security baseline | Done | `docs/SECURITY_BASELINE.md` |
| 1.1 Test harness + coverage | Done | factories, `test:cov`, 70% lines/stmts on scoped files; Auth + CRM leads tests |
| 1.2 Tenant isolation suite | Done (unit) | `test/tenant-isolation.e2e-spec.ts` table-driven; HTTP e2e gated on `TEST_DATABASE_URL` |
| 1.4 CI coverage upload | Partial | CI runs `test:cov` + uploads lcov |
| 2.3 Error leak fix | Done | Prod hides raw `Error.message` |
| 4.2 Health endpoints | Done | `GET /api/v1/health/live`, `/api/v1/health/ready` |
| Next.js bump | Done | `15.5.19` → `15.5.21` (audit quick win) |
| **P0 Customer tenancy** | Done | `Customer.tenantId` + migration; booking confirm scoped |
| **P0 LMS aggregates** | Done | dashboard/reports/goals filter `lead: { tenantId }` |
| **P0 RBAC wire-up** | Done | `@RequirePermissions` on admin/finance/HR write/support/tab-logins |
| **P0 DTO validation** | Done | support, tab-logins, LMS dismiss/label DTOs |
| **Permission seed** | Done | Seed creates permission rows + Super Admin links |

## Verify

```bash
pnpm --filter @propos/backend test:cov
# With API running:
curl http://localhost:3001/api/v1/health/live
curl http://localhost:3001/api/v1/health/ready
```

## Remaining (playbook order)

- **1.3** Frontend Vitest + Playwright e2e  
- **1.4** Full CI (Postgres service, e2e, audit job, migration check)  
- **2.1–2.4** Auth rotation/lockout, RBAC depth for remaining modules, helmet/request-id polish, AuditLog + PII encrypt  
- **3.x** Prisma tenant extension + per-tenant limits  
- **4.1 / 4.3** pino/OTel/Sentry; DR scripts  
- **5–11** Payments, GST/RERA/DPDP, perf, IaC/CD, SSO, mobile, go-live  

## Known P0 follow-ups from audit

- ~~Customer model has no `tenantId`; booking confirm does global phone lookup~~ **Fixed**
- ~~9 unscoped Prisma sites (LMS + customer/booking)~~ **Fixed** (structural Prisma middleware still pending in 3.x)
- ~~`@RequirePermissions` never applied~~ **Fixed** on sensitive admin/finance/HR/support routes
- ~~LMS/support/tab-logins inline `@Body()`~~ **Fixed**
- No structural Prisma tenant middleware yet  
- Dependency audit still has residual highs after Next bump — re-run `pnpm audit`
