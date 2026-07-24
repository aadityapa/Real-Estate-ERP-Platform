# PropOS security review (Phase 11.2)

**Date:** 2026-07-24  
**Scope:** PropOS backend (`backend/src`) — REST, GraphQL, Socket.IO — OWASP API Top 10 lens.  
**Mode:** Report only — **no code changes in this pass.**

## Executive summary

PropOS has strong structural controls (tenant Prisma extension, money as paise, webhook HMAC, production secret fail-fast, refresh rotation, log redaction). The highest residual risk from recent enterprise work is **unverified SSO claim acceptance** (OIDC/SAML MVP), plus older **missing RBAC on several domain controllers** and **PII over-exposure on list endpoints**. Treat F-001/F-002 as P0 before any customer IdP go-live.

## Findings

### F-001 — SSO OIDC callback trusts client-supplied claims
- **Severity:** Critical
- **Location:** `backend/src/modules/sso/sso.controller.ts` (~50–63), `backend/src/modules/sso/sso.service.ts` (~61–83)
- **Issue:** Public OIDC callback accepts email/sub/groups from JSON body without JWKS/ID-token verification, then JIT-provisions and issues JWTs.
- **Fix:** Exchange `code` / verify `id_token` against IdP JWKS (`iss`/`aud`/`exp`/`nonce`); never trust body claims.

### F-002 — SAML signature check is non-cryptographic
- **Severity:** Critical
- **Location:** `backend/src/modules/sso/sso.service.ts` (`verifyXmlSignature`, ACS handler)
- **Issue:** Soft check only confirms PEM presence + XML length; no XML-DSig validation.
- **Fix:** Use `node-saml` / `xml-crypto`; validate Audience, Recipient, NotOnOrAfter.

### F-003 — Controllers without `@RequirePermissions`
- **Severity:** High
- **Location:** e.g. `customers.controller.ts`, `channel-partners.controller.ts`, `purchase-orders.controller.ts`, `assets.controller.ts`, `milestones.controller.ts`, `dpr.controller.ts`, `site-visits.controller.ts`, `follow-ups.controller.ts`, `campaigns.controller.ts`, several LMS controllers
- **Issue:** `PermissionsGuard` no-ops when metadata absent → any authenticated tenant user can mutate those resources.
- **Fix:** Add `@RequirePermissions` on every non-public handler; lint that routes declare permissions.

### F-004 — Decrypted PII on list endpoints
- **Severity:** High
- **Location:** `customers.service.ts`, `vendors.service.ts`, `employees.service.ts` + `pii-prisma.extension.ts`
- **Issue:** Full-row reads decrypt PAN/Aadhaar/bankDetails into list responses.
- **Fix:** `select` excluding sensitive fields on lists; gated PII detail endpoint + audit.

### F-005 — SCIM default bearer token
- **Severity:** High
- **Location:** `backend/src/modules/sso/scim.controller.ts` (~158–163)
- **Issue:** Falls back to `scim-dev-token`; not in production secret assert.
- **Fix:** Require `SCIM_BEARER_TOKEN` in prod boot; prefer per-tenant SCIM secrets.

### F-006 — E-sign mock fail-open
- **Severity:** High
- **Location:** `backend/src/modules/legal/esign/esign.module.ts`, `mock-esign.adapter.ts`
- **Issue:** Missing Digio config silently uses mock + default webhook secret.
- **Fix:** Fail boot in production if provider resolves to mock / placeholder secret.

### F-007 — Global guards not GraphQL-aware
- **Severity:** Medium
- **Location:** `jwt-auth.guard.ts`, `tenant.guard.ts`, `permissions.guard.ts` vs `tenant-rate-limit.guard.ts`
- **Issue:** HTTP-only `getRequest()`; GraphQL relies on per-resolver guards.
- **Fix:** Mirror GraphQL context extraction used by rate-limit guard; add GraphQL auth e2e.

### F-008 — Access tokens survive logout
- **Severity:** Medium
- **Location:** `auth.service.ts` logout paths; `jwt.strategy.ts`
- **Issue:** Logout revokes refresh sessions only; access JWT valid until expiry.
- **Fix:** Short TTL + optional Redis denylist for logout/password-change.

### F-009 — Open tenant self-registration
- **Severity:** Medium
- **Location:** `auth.controller.ts` register; `auth.service.ts` register
- **Issue:** Public tenant+Super Admin creation without email verify.
- **Fix:** Verification + CAPTCHA; invite-only mode for prod.

### F-010 — Login timing enumeration
- **Severity:** Medium
- **Location:** `auth.service.ts` login
- **Issue:** bcrypt skipped when user missing → timing oracle for emails.
- **Fix:** Always bcrypt against dummy hash.

### F-011 — Relation-scoped models lack structural tenant backstop
- **Severity:** Medium
- **Location:** `tenant-models.ts` `RELATION_SCOPED_MODELS`; `tenant-prisma.extension.ts`
- **Issue:** Projects/Units/Bookings/etc. depend on manual relation filters.
- **Fix:** Lint/test asserting tenant-bound `where` on relation-scoped queries.

### F-012 — Impersonation incomplete
- **Severity:** Low
- **Location:** `platform-admin.service.ts` (`assertActiveImpersonation` unused)
- **Issue:** Session rows + audit exist; no JWT “act as” wiring / enforcement call sites.
- **Fix:** Issue time-boxed impersonation token bound to sessionId, or hide endpoints until complete.

### F-013 — `retryDelivery` unscoped by tenant
- **Severity:** Low
- **Location:** `platform-api/api-keys.service.ts` `retryDelivery`
- **Issue:** Lookup by delivery id only (currently unused by controllers).
- **Fix:** Require `tenantId` via endpoint relation before exposure.

### F-014 — Swagger on by default
- **Severity:** Low
- **Location:** `main.ts` Swagger setup
- **Issue:** Enabled unless `SWAGGER_ENABLED=false`.
- **Fix:** Opt-in (`=== "true"`) or disable when `NODE_ENV=production`.

### F-015 — Pagination Max only in utility
- **Severity:** Low
- **Location:** `packages/shared-utils` `getPaginationParams`; filter DTOs
- **Issue:** No `@Max(100)` on DTO `limit` fields.
- **Fix:** Shared base filter DTO with `@Max(100)`.

### F-016 — Mass assignment relies on ValidationPipe alone
- **Severity:** Info
- **Location:** `main.ts` ValidationPipe; various `...dto` spreads
- **Issue:** Single control plane for field allowlists.
- **Fix:** Explicit field maps on high-risk writes (status, money, roles).

### F-017 — CORS localhost fallback in production risk
- **Severity:** Info
- **Location:** `common/config/cors.ts`
- **Issue:** Missing `CORS_ORIGINS` falls back to localhost; no prod assert.
- **Fix:** Fail boot in production without explicit origins.

## Positive controls

- Tenant Prisma extension + isolation tests; optional RLS migration.
- JWT refresh rotation + reuse revoke; bcrypt cost 12; login lockout.
- Production secret fail-fast (JWT/storage/PII); hashed sessions; signed storage URLs.
- Razorpay/billing webhook HMAC + idempotency; money as BIGINT paise.
- AuditLog append-only (hashed field diffs); pino redaction; Helmet/HSTS/CSP (prod).
- Trivy container gate + CD migration destructive gate.

## Fix task list (suggested order)

| Priority | IDs | Owner | Notes |
|----------|-----|-------|-------|
| P0 | F-001, F-002 | Eng | Block SSO go-live until cryptographic verification |
| P0 | F-005, F-006 | Eng | Production secret asserts |
| P1 | F-003, F-004 | Eng | RBAC coverage + PII select |
| P1 | F-007, F-011 | Eng | GraphQL guards + relation-scope lint |
| P2 | F-008–F-010, F-014 | Eng | Auth UX / Swagger defaults |
| P3 | F-012, F-013, F-015–F-017 | Eng | Complete impersonation; defense in depth |

*This document satisfies playbook Prompt 11.2 (report only).*
