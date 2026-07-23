# PropOS SaaS billing (Phase 5.2)

Subscription billing for PropOS tenants (STARTER / GROWTH / ENTERPRISE).
Customer booking payments remain under `/sales/payments/gateway` (Phase 5.1).

## Plans & entitlements

| Plan | Seats | Projects | Storage | API RPM | Highlights |
|------|-------|----------|---------|---------|------------|
| STARTER | 5 | 1 | 1 GiB | 60 | CRM + documents |
| GROWTH | 25 | 10 | 10 GiB | 300 | + LMS, finance, construction, AI (`api_access`) |
| ENTERPRISE | 200 | unlimited | 100 GiB | 1000 | + SSO, custom roles, advanced analytics |

Prices (integer paise): see `PLAN_LIMIT_DEFAULTS` in
`backend/src/common/limits/plan-defaults.ts`. Trials default to 14 days.

## Flows

1. **Subscribe** — `POST /api/v1/billing/subscribe` creates a Razorpay Subscription
   (optionally with trial), stores `Subscription` (amount/MRR in paise), sets
   `Tenant.plan`.
2. **Upgrade / change plan** — `POST /api/v1/billing/change-plan` updates the
   gateway subscription with proration (`scheduleChangeAt: now|cycle_end`) and
   lifts plan limits immediately on `Tenant.plan`.
3. **Cancel** — `POST /api/v1/billing/cancel` (default at period end).
4. **Webhooks** — `POST /api/v1/billing/webhook` verifies HMAC, dedupes by
   `GatewayWebhookEvent(provider, eventId)`:
   - `subscription.charged` / `activated` → ACTIVE + `SaasInvoice` (GST deferred)
   - `subscription.pending` / `halted` → dunning (`PAST_DUE` → `HALTED` after 3)
   - `subscription.cancelled` / `completed` → CANCELLED + churn analytics
5. **Analytics** — structured log events: `billing.usage_snapshot`,
   `billing.mrr_changed`, `billing.churn`, `billing.trial_started`,
   `billing.subscription_activated`.

## Enforcement hooks

| Entitlement | Hook |
|-------------|------|
| Seats | `TenantUsageService.assertSeatAvailable` (user create) — `PLAN_LIMIT_EXCEEDED` |
| Projects | `assertProjectAvailable` (project create) |
| Storage | `assertStorageAvailable` (document create) |
| API RPM | `TenantRateLimitGuard` |
| Features | `FeatureFlagsGuard` + `@RequireFeatures(...)` (e.g. AI requires `api_access`) |

Acceptance: a STARTER tenant at 5 seats is blocked; upgrading to GROWTH lifts the
seat cap without changing seat count.

## API

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/v1/billing/plans` | `admin:read:billing` |
| GET | `/api/v1/billing/subscription` | `admin:read:billing` |
| GET | `/api/v1/billing/invoices` | `admin:read:billing` |
| POST | `/api/v1/billing/subscribe` | `admin:write:billing` |
| POST | `/api/v1/billing/change-plan` | `admin:write:billing` |
| POST | `/api/v1/billing/cancel` | `admin:write:billing` |
| POST | `/api/v1/billing/webhook` | public (HMAC) |

## Env

```
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
# Optional pre-created Razorpay plan ids (else created via API on first subscribe):
RAZORPAY_PLAN_STARTER_MONTHLY=
RAZORPAY_PLAN_STARTER_YEARLY=
RAZORPAY_PLAN_GROWTH_MONTHLY=
RAZORPAY_PLAN_GROWTH_YEARLY=
RAZORPAY_PLAN_ENTERPRISE_MONTHLY=
RAZORPAY_PLAN_ENTERPRISE_YEARLY=
```

Webhook URL (Dashboard): `POST /api/v1/billing/webhook`  
Events: `subscription.activated`, `subscription.charged`, `subscription.pending`,
`subscription.halted`, `subscription.cancelled`, `subscription.completed`.

## Migration

`20260723200000_saas_subscription_billing`

```bash
pnpm --filter @propos/backend exec prisma migrate deploy
```

If Postgres is down (e.g. `localhost:51218`), apply when the DB is up. Do not use
`db push` for shared environments.

GST-compliant tax invoices / IRN: Phase 6.1 (`taxNote` placeholder on `SaasInvoice`).

## Frontend admin page

See `docs/BILLING_ADMIN_PAGE.md`.
