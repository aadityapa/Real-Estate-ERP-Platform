# Tenant isolation (Phase 3.1)

PropOS enforces multi-tenant isolation in layers:

1. **JWT + `TenantGuard`** — every non-public route requires `user.tenantId`.
2. **`TenantContext` (ALS)** — `TenantContextInterceptor` binds JWT `tenantId` into
   AsyncLocalStorage for the request (HTTP + GraphQL).
3. **Prisma tenant extension** — for models with a direct `tenantId` column, the
   extension auto-injects that id into `where` / `data` when context is set, and
   rejects cross-tenant or missing-tenant writes.
4. **Optional Postgres RLS** — policies exist on direct-tenant tables but are
   **no-op** until explicitly enabled (see below).

## Direct-tenant models (auto-scoped)

See `backend/src/database/tenant-models.ts` → `DIRECT_TENANT_MODELS`
(e.g. `Lead`, `Customer`, `Document`, `Vendor`, `User`, …).

## Global allowlist (never auto-scoped)

- `Tenant`
- `Permission`

## Relation-scoped models (no direct `tenantId`)

Examples: `Project` → `Company.tenantId`, `Booking` → `Lead`/`Customer`,
`Session` → `User.tenantId`, `Payment` → `Booking` → …

The Prisma extension **cannot** safely inject filters for these. Services must
keep explicit relation filters (`where: { company: { tenantId } }`, etc.).
The list lives in `RELATION_SCOPED_MODELS`.

## Bypass (system paths)

Auth bootstrap, seeds, and jobs that must query across tenants:

```ts
tenantContext.runAsSystem(() => prisma.user.findUnique({ where: { email } }));
```

Creates without request context still require `data.tenantId` on direct-tenant
models (register/seed).

## Enforced Prisma client

Application code must use Nest `PrismaService` (extended client). A unit test
fails if `src/` constructs `new PrismaClient()` outside `database/prisma.service.ts`.

## Enabling Postgres RLS (defense in depth)

Migration: `20260723140000_tenant_rls_opt_in`

```bash
pnpm --filter @propos/backend exec prisma migrate deploy
```

Policies allow all rows while `app.propos_rls` is unset/`off`. To enforce:

```sql
SET LOCAL app.propos_rls = 'on';
SET LOCAL app.tenant_id = '<tenant-cuid>';
```

Set `POSTGRES_RLS_ENABLED=true` when the app wires those `SET LOCAL` calls on
each request/transaction (future hook on `PrismaService`). Until then, leave the
flag false — the Prisma extension is the primary control.

### Tradeoffs

| | |
|--|--|
| Pros | DB-level guarantee; protects raw SQL / BI roles |
| Cons | Needs per-request `SET LOCAL`; pooler must not leak session GUC; migrate/seed as table owner may bypass unless using a non-owner app role + `FORCE ROW LEVEL SECURITY` |

Do **not** enable `FORCE ROW LEVEL SECURITY` in production until the app role and
`SET LOCAL` path are verified in staging.

## Related

- Per-tenant rate / usage / queue fairness: `docs/TENANT_LIMITS.md` (Phase 3.2)
