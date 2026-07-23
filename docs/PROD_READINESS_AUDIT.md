# PropOS Production-Readiness Audit

**Date:** 2026-07-23  
**Scope:** `backend/`, `frontend/`, CI, config (read-only audit — no code changes)  
**Playbook:** Phase 0.1

---

## Executive summary

PropOS has a solid multi-tenant NestJS + Next.js foundation (global JWT/Tenant/Permissions guards, ValidationPipe, helmet, throttling, signed `/storage` URLs). The largest production blockers are **near-zero automated test coverage outside auth/crypto**, **no health/readiness/observability**, **no structural Prisma tenant enforcement**, and **dependency vulnerabilities (notably Next.js & transitive tar/multer/ws)**.

| Area | Status | Top severity |
|------|--------|--------------|
| Tests | 3 specs / 17 tests only | **P0** |
| Tenant isolation | Mostly manual `tenantId` in services; not structural | **P0** |
| Input validation | Global ValidationPipe present; DTOs common | P1 |
| Secrets/config | `.env.example` mostly complete; no prod boot guard | P1 |
| Security headers/CORS/rate limit | Present globally | P1 (auth tighter limits partial) |
| Error handling | Global filter; Error.message can leak | P1 |
| Observability | Missing health, metrics, request IDs, Sentry | **P0** |
| Frontend resilience | Empty/error UI components exist; no ErrorBoundary | P1 |

---

## 1. Test coverage

### Modules under `backend/src/modules/`

| Module | Spec files | Covered? |
|--------|------------|----------|
| auth | `auth.service.spec.ts` | Partial (unit) |
| crm | — | No |
| sales | — | No |
| admin | — | No |
| hr | — | No |
| construction | — | No |
| finance | — | No |
| vendors | — | No |
| procurement | — | No |
| documents | — | No |
| legal | — | No |
| assets | — | No |
| marketing | — | No |
| channel-partners | — | No |
| ai | — | No |
| customers | — | No |
| notifications | — | No |
| events | — | No |
| lms | — | No |
| support | — | No |

### Existing tests (ran 2026-07-23)

```
PASS src/common/utils/crypto.spec.ts
PASS src/common/interceptors/transform.interceptor.spec.ts
PASS src/modules/auth/auth.service.spec.ts
Test Suites: 3 passed | Tests: 17 passed
```

- Jest configured in `backend/jest.config.js` with `collectCoverageFrom` but **no coverage threshold** and no `test:cov` script wired in root CI beyond `pnpm test`.
- **Coverage %:** not gated; effectively near-zero for domain modules (~auth + 2 common utils).
- No integration/e2e suite; no tenant-isolation suite; no frontend Vitest/Playwright in CI.

**Severity:** P0 — diligence red flag; regressions unchecked.  
**Fix:** Phase 1.1–1.4 (harness, coverage gate ≥70%, tenant isolation e2e, frontend/e2e, CI jobs).

---

## 2. Tenant isolation risk

### How tenancy works today

- `TenantGuard` (global) requires `request.user.tenantId` on non-public routes.
- Services typically take `tenantId` as a method arg and filter with `findFirst({ where: { id, tenantId } })`.
- **Phase 3.1:** `TenantContext` ALS + Prisma `tenant-scope` extension auto-injects `tenantId` for direct-tenant models when the JWT interceptor is active; optional Postgres RLS migration is opt-in (no-op until `app.propos_rls=on`). See `docs/TENANT_ISOLATION.md`.
- `TenantGuard` still does **not** alone verify row ownership — the extension + service filters do.

### Full scan (288 Prisma call sites — explore audit)

| scoped? | count |
|---------|-------|
| yes (tenant in where/data) | 176 |
| partial (id-only after prior tenant find) | 95 |
| **no (unscoped)** | **0** (was 9; fixed 2026-07-23) |
| n/a (auth bootstrap) | 8 |

**Confirmed unscoped (P0/P1) — FIXED 2026-07-23:**

| File | Issue |
|------|-------|
| `customers.service.ts` create | ~~no tenantId~~ → `Customer.tenantId` + scoped CRUD |
| `bookings.service.ts` confirm | ~~global phone lookup~~ → tenant-scoped find/create |
| `lms-dashboard/reports/goals` | ~~unscoped counts~~ → `lead: { tenantId }` filters |
| RBAC / DTOs | `@RequirePermissions` on admin/finance/HR/support; DTOs for support/tab-logins/LMS |

`TenantGuard` checks JWT has `tenantId`. Phase **3.1** Prisma tenant extension + opt-in RLS are implemented (`docs/TENANT_ISOLATION.md`).

---

## 3. Input validation

- Global `ValidationPipe` in `main.ts`: `whitelist`, `forbidNonWhitelisted`, `transform` — **good**.
- Domain modules generally use class-validator DTOs (`Create*Dto`, `Filter*Dto`).
- Residual risk: GraphQL resolvers / any `@Body()` without DTO class; LMS report query params may be loosely typed.

**Severity:** P1  
**Fix:** Audit every controller `@Body()`/`@Query()`; forbid raw `Record<string, unknown>` (Phase 2.3).

---

## 4. Secrets & config

Documented in `backend/.env.example`: `DATABASE_URL`, `REDIS_URL`, JWT_*, `STORAGE_URL_SECRET`, CORS, AWS, OpenAI, WhatsApp, Twilio, SMTP, SMS, GST.

| Usage | Documented? |
|-------|-------------|
| JWT_*, DATABASE_URL, REDIS_URL, CORS_ORIGINS, FRONTEND_URL, STORAGE_URL_SECRET, OPENAI_API_KEY, AWS_* | Yes |
| HOST, PORT, NODE_ENV | Partially (PORT/NODE_ENV yes; HOST missing from example) |
| Prod placeholder refusal at boot | **Missing** |

Placeholder secrets (`change-me-in-production...`) can be used in production today.

**Severity:** P1  
**Fix:** Add HOST to `.env.example`; fail-fast boot check in production (Phase 2.1 / 2.4).

---

## 5. Security headers, CORS, rate limiting, auth guards

| Control | Status |
|---------|--------|
| helmet | Yes (`main.ts`); CSP disabled in non-prod |
| CORS allowlist | Yes (`getCorsOrigins()`) |
| ThrottlerGuard | Global 100/min; auth should confirm `@Throttle` override |
| JwtAuthGuard | Global APP_GUARD |
| TenantGuard | Global |
| PermissionsGuard | Global |
| GraphQL introspection | Off in production |
| Signed `/storage` URLs | Yes (HMAC) |

**Severity:** P1 — tighten auth/file route limits; ensure GraphQL uses same guards.  
**Fix:** Phase 2.3.

---

## 6. Error handling

`GlobalExceptionFilter` returns `{ success: false, error: { code, message, details } }`.

- Stack traces logged server-side, **not** returned in JSON — good.
- For non-`HttpException` `Error`, **client gets `exception.message`** — can leak Prisma/DB internals.

**Severity:** P1  
**Fix:** In production, always return generic message for 500s; map known errors; add request id (Phase 2.3 / 4.1).

---

## 7. Observability

| Capability | Exists? |
|------------|---------|
| Structured logging (pino) | No (Nest Logger only) |
| Request IDs | No |
| `/health/live` / `/health/ready` | No |
| `/metrics` | No |
| OpenTelemetry | No |
| Sentry / error tracking | No |

**Severity:** P0 for production ops.  
**Fix:** Phase 4.1–4.2.

---

## 8. Frontend

| Item | Status |
|------|--------|
| API client (`lib/api.ts`) | Throws `ApiClientError` on failure |
| Empty/error UI components | Present (`empty-state.tsx`, `error-state.tsx`) |
| React ErrorBoundary | Not found |
| Accessibility | Not audited systematically |
| Theme script | `dangerouslySetInnerHTML` for FOUC prevention (acceptable if static) |

**Severity:** P1  
**Fix:** App-level ErrorBoundary; wire empty/error states on all list pages; a11y pass (Phase 1.3+).

---

## First 10 things to fix (priority order)

1. **P0** — Backend test harness + coverage gate (`test:cov`, ≥70% threshold path) — Phase 1.1  
2. **P0** — Tenant-isolation e2e suite for all modules — Phase 1.2  
3. **P0** — Health/live + ready endpoints + graceful shutdown — Phase 4.2  
4. **P0** — Prisma tenant middleware/extension — Phase 3.1 ✅  
5. **P0** — Upgrade Next.js ≥15.5.21 (and re-audit) — Phase 0.2 remediation  
6. **P1** — Stop leaking `Error.message` on 500 responses in production — Phase 2.3  
7. **P1** — Refresh-token rotation + logout + lockout — Phase 2.1  
8. **P1** — AuditLog for bookings/payments/users — Phase 2.4  
9. **P1** — CI: coverage upload, Postgres service, audit job, migration check — Phase 1.4  
10. **P1** — Structured logs + request id + Sentry — Phase 4.1  

---

## Verification commands (this audit)

```bash
pnpm --filter @propos/backend test
pnpm audit
# Manual: review backend/src/main.ts, app.module.ts, common/guards, global-exception.filter.ts
```
