# Per-tenant limits & fairness (Phase 3.2)

Prevents noisy-neighbor starvation and records usage for Phase 5 plan/billing.

## Limits (plan defaults + overrides)

| Plan | API RPM | Seats | Storage | Queue concurrency |
|------|---------|-------|---------|-------------------|
| STARTER | 60 | 5 | 1 GiB | 2 |
| GROWTH | 300 | 25 | 10 GiB | 5 |
| ENTERPRISE | 1000 | 200 | 100 GiB | 20 |

Overrides live in `TenantLimits` (nullable columns → plan default).

Migration: `20260723160000_tenant_limits`

```bash
pnpm --filter @propos/backend exec prisma migrate deploy
```

If Postgres is down, `migrate deploy` will fail — apply when the DB is up. Schema
is already in `schema.prisma`; do not use `db push` for shared environments.

## Enforcement

1. **Per-tenant API rate** — `TenantRateLimitGuard` (after JWT/Tenant) increments
   Redis `tenant:{id}:rl:api:{minuteBucket}` and returns 429 when over RPM.
   Global IP throttling (`ThrottlerGuard`) remains in place.
2. **Seats** — `UsersService.create` calls `assertSeatAvailable`.
3. **Storage** — `DocumentsService.create` calls `assertStorageAvailable`
   (sum of `Document.fileSize`).
4. **BullMQ fairness** — shared queue `propos-tenant-jobs` with a Redis
   semaphore `tenant:{id}:queue:active` capped by `queueConcurrency`. Excess
   jobs are delayed (`DelayedError`), so other tenants keep progressing.

## Admin API

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/v1/admin/usage` | `admin:read:usage` |
| PATCH | `/api/v1/admin/usage/limits` | `admin:write:usage` |

Response includes plan, effective limits, overrides, and usage
(`apiCallsLastMinute`, `apiCallsToday`, `seats`, `storageBytes`, `queueActiveJobs`).

## Load check (k6)

```bash
k6 run -e BASE_URL=http://localhost:3001/api/v1 \
  -e TOKEN_A=<jwt-a> -e TOKEN_B=<jwt-b> \
  scripts/k6/tenant-fairness.js
```

Hammers tenant A while asserting tenant B `fail_rate < 10%`.
