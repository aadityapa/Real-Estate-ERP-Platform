# PropOS database performance (Phase 7.1)

Indexes, query-shape fixes, Prisma pool limits, and PgBouncer guidance for the
PostgreSQL / Prisma layer.

## Findings (before → after)

### CRM leads list (`GET /crm/leads`)

| Mode | Queries | Notes |
|------|---------|--------|
| **Before** (offset) | 2 | `findMany` + `count`; relations via deliberate `include`/`_count` (no N+1) |
| **After** (offset) | 2 | Same shape; uses composite `(tenantId, isArchived, createdAt\|status\|…)` |
| **After** (cursor=`?cursor=`) | **1** | Keyset `take: limit+1`; no `COUNT(*)` — preferred for deep pages |

Offset page 50 on a large tenant previously scanned/skipped ~1000 rows; cursor
stays O(limit) with the new indexes. Timings depend on data volume; EXPLAIN
guidance below.

### CRM dashboard (`GET /crm/leads/dashboard`)

| | Queries | Shape |
|--|---------|--------|
| Before / after | **5** (parallel) | `count` + 2× `groupBy` + follow-ups today + site visits today |

No N+1. Latency improves from indexes on `Lead(tenantId,isArchived,*)` and
`FollowUp`/`SiteVisit(leadId, scheduledAt)` for the “today” joins.

### LMS leaderboard (`GET /lms/dashboard/leaderboard`) — N+1 fixed

| | Queries (N = active users with leads) |
|--|----------------------------------------|
| **Before** | `1 + 3N` (users, then per-user lead/visit/booking counts) |
| **After** | **4** (`groupBy` leads + visits + bookings, then `user.findMany` for ids) |

### LMS funnel

| | Queries |
|--|---------|
| **Before** | 7 (`count` per stage) |
| **After** | **1** (`groupBy` status) |

### LMS data feed

Already used `include` (not N+1). Added optional `?cursor=` (1 query) and
`take: 100` cap on “my claimed”. Feed sort uses
`(tenantId, feedScore, createdAt)`.

## Indexes added

Migration: `20260724100000_db_perf_indexes`

| Table | Index |
|-------|--------|
| Lead | `(tenantId, isArchived, createdAt\|status\|source\|updatedAt)` |
| Lead | `(tenantId, assignedToId, isArchived)`, `(tenantId, projectId, isArchived)` |
| Lead | `(tenantId, feedScore, createdAt)`, `(tenantId, claimedById, claimedAt)` |
| FollowUp | `(leadId, scheduledAt)`, `(status, scheduledAt)` |
| CallLog | `(leadId, calledAt)` |
| SiteVisit | `(leadId, scheduledAt)`, `(status, completedAt)`, `(attendedBy, status, completedAt)` |
| Booking | `(salesPersonId, createdAt)`, `(status, createdAt)` |
| Unit | `(projectId, status)` |

```bash
pnpm --filter @propos/backend exec prisma migrate deploy
```

If Postgres is down (e.g. `localhost:51218` from `docker-compose.local.yml`),
apply when the DB is up. Do not use `db push` in shared environments.

## Connection pooling

### App-side (Prisma)

`PrismaService` rewrites `DATABASE_URL` to include:

| Param | Default | Env override |
|-------|---------|--------------|
| `connection_limit` | `10` | `PRISMA_CONNECTION_LIMIT` |
| `pool_timeout` | `20` (seconds) | `PRISMA_POOL_TIMEOUT` |
| `pgbouncer` | unset | set when `PGBOUNCER=true` |

Rule of thumb: `(Prisma connection_limit × API replicas) < PgBouncer pool_size
< Postgres max_connections` (leave headroom for migrations / admin).

### PgBouncer (recommended in production)

- Run PgBouncer in **transaction** mode in front of RDS/Aurora.
- Point `DATABASE_URL` at PgBouncer; set `PGBOUNCER=true` (or
  `?pgbouncer=true`) so Prisma disables prepared statements.
- Prefer a separate direct URL for `prisma migrate deploy` (session features /
  advisory locks), e.g. `DIRECT_DATABASE_URL` if you introduce one later.
- Example pooler DSN:
  `postgresql://propos:***@pgbouncer:6432/propos?pgbouncer=true&connection_limit=10`

## Slow-query logging

Outside `NODE_ENV=production`, Prisma emits `query` events. Queries slower than
`PRISMA_SLOW_QUERY_MS` (default **200**) are logged with duration + truncated
SQL only — **never** bind params (PII risk).

## EXPLAIN guidance

```sql
-- CRM list (archived filter + sort)
EXPLAIN (ANALYZE, BUFFERS)
SELECT id FROM "Lead"
WHERE "tenantId" = $1 AND "isArchived" = false
ORDER BY "createdAt" DESC, id DESC
LIMIT 20;

-- Dashboard follow-ups today (join through lead for tenant)
EXPLAIN (ANALYZE, BUFFERS)
SELECT COUNT(*) FROM "FollowUp" f
JOIN "Lead" l ON l.id = f."leadId"
WHERE l."tenantId" = $1
  AND f."scheduledAt" >= $2 AND f."scheduledAt" < $3;
```

Prefer `Index Scan` / `Bitmap Index Scan` on the Phase 7.1 composites. If you
see `Seq Scan` on large tenants, confirm the migration applied and
`tenantId`/`isArchived` are in the predicate (tenant isolation must not regress).

## Tenant isolation

All list/dashboard/feed queries still take an explicit `tenantId` (or
`lead: { tenantId }`). New indexes lead with `tenantId` so planners prefer
tenant-scoped plans. Do not drop the `tenantId` filter to “use an index”.
