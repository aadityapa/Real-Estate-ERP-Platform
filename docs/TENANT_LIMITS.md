# Per-tenant limits & fairness (Phase 3.2 + 5.2)

Prevents noisy-neighbor starvation and records usage for SaaS plan/billing.

## Limits (plan defaults + overrides)

| Plan | API RPM | Seats | Projects | Storage | Queue concurrency |
|------|---------|-------|----------|---------|-------------------|
| STARTER | 60 | 5 | 1 | 1 GiB | 2 |
| GROWTH | 300 | 25 | 10 | 10 GiB | 5 |
| ENTERPRISE | 1000 | 200 | unlimited (-1) | 100 GiB | 20 |

Feature flags (crm, lms, finance, documents, construction, api_access, sso,
custom_roles, advanced_analytics) live on the plan catalog; optional overrides
in `TenantLimits.featureFlags`. See `docs/BILLING.md`.

Overrides live in `TenantLimits` (nullable columns → plan default).

Migrations: `20260723160000_tenant_limits`, `20260723200000_saas_subscription_billing`

```bash
pnpm --filter @propos/backend exec prisma migrate deploy
```

If Postgres is down, `migrate deploy` will fail — apply when the DB is up. Schema
is already in `schema.prisma`; do not use `db push` for shared environments.

## Enforcement

1. **Per-tenant API rate** — `TenantRateLimitGuard` (after JWT/Tenant) increments
   Redis `tenant:{id}:rl:api:{minuteBucket}` and returns 429 when over RPM.
   Global IP throttling (`ThrottlerGuard`) remains in place.
2. **Seats** — `UsersService.create` calls `assertSeatAvailable`
   (`PLAN_LIMIT_EXCEEDED`).
3. **Projects** — `ProjectsService.create` calls `assertProjectAvailable`.
4. **Storage** — `DocumentsService.create` calls `assertStorageAvailable`
   (sum of `Document.fileSize`).
5. **Features** — `FeatureFlagsGuard` + `@RequireFeatures` (e.g. AI needs
   `api_access` → GROWTH+).
6. **BullMQ fairness** — shared queue `propos-tenant-jobs` with a Redis
   semaphore `tenant:{id}:queue:active` capped by `queueConcurrency`. Excess
   jobs are delayed (`DelayedError`), so other tenants keep progressing.

## Admin API

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/v1/admin/usage` | `admin:read:usage` |
| PATCH | `/api/v1/admin/usage/limits` | `admin:write:usage` |

Response includes plan, effective limits (incl. projects + features), overrides,
and usage (`apiCallsLastMinute`, `apiCallsToday`, `seats`, `projects`,
`storageBytes`, `queueActiveJobs`).

Billing endpoints: `docs/BILLING.md`.

## Load check (k6)

```bash
k6 run -e BASE_URL=http://localhost:3001/api/v1 \
  -e TOKEN_A=<jwt-a> -e TOKEN_B=<jwt-b> \
  scripts/k6/tenant-fairness.js
```

Hammers tenant A while asserting tenant B `fail_rate < 10%`.
