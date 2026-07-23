# Billing admin page — frontend spec (Phase 5.2)

Wire this under `frontend/app/(dashboard)/admin/billing/page.tsx` (or Settings → Billing).
Reuse existing admin layout, TanStack Query, and permission gates.

## Permissions

- Read: `admin:read:billing`
- Write: `admin:write:billing`

Hide the nav item when the user lacks read permission (same pattern as usage).

## Layout (one job per section)

### 1. Current plan

- Headline: plan name (`STARTER` | `GROWTH` | `ENTERPRISE`) + status badge
  (`TRIAL` / `ACTIVE` / `PAST_DUE` / `HALTED` / cancel-at-period-end).
- Supporting line: billing cycle, next renewal / trial end (from
  `GET /api/v1/billing/subscription`).
- Primary CTA: **Upgrade** (opens change-plan dialog). Secondary: **Cancel**.
- Do not put invoice tables or plan comparison in this first viewport band.

### 2. Usage vs entitlements

Progress bars (current / max) for:

- Seats
- Projects (`-1` → show “Unlimited”)
- Storage (bytes → GiB)
- API calls last minute vs RPM

Source: same subscription payload (`usage` + `entitlements`). On
`PLAN_LIMIT_EXCEEDED` from user/project create APIs, deep-link here with the
`limit` field highlighted.

### 3. Plan catalog

Cards only as interactive choose-plan controls (not decorative).

- From `GET /api/v1/billing/plans`.
- Show monthly/yearly toggle; amounts in INR (paise ÷ 100).
- Feature checklist from `features` map.
- Selecting a plan calls `POST /billing/subscribe` (no sub yet) or
  `POST /billing/change-plan` (existing).

### 4. Invoices

Simple table: number, period, amount (INR), status, paidAt.
`GET /api/v1/billing/invoices`. Note: GST PDF/IRN lands in Phase 6 — show
`taxNote` as “Tax invoice pending” when present.

### 5. Checkout handoff

After subscribe, if `checkout.shortUrl` is returned, open Razorpay subscription
authorization (new tab or embedded). Poll `GET /billing/subscription` until
status leaves `created` / enters `TRIAL`|`ACTIVE` (webhook is source of truth).

## Error UX

Map `403` bodies with `code: PLAN_LIMIT_EXCEEDED` to a toast + Upgrade CTA.
Never surface raw gateway errors; show “Billing provider unavailable”.

## Out of scope for this page

- GST e-invoice / GSTR (Phase 6.1)
- Customer booking payments (sales gateway)
- Super-admin cross-tenant MRR dashboard (future analytics sink)
