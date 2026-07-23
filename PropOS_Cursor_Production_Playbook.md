# PropOS → Production & Enterprise‑Grade

## A Cursor AI Prompt Playbook

This playbook turns the existing **PropOS** monorepo (NestJS 11 API · Next.js 15 web · Expo mobile · Prisma/PostgreSQL · Redis/BullMQ · Socket.IO · OpenAI · multi‑tenant) into a hardened, deployable, enterprise‑ready product. It is a sequence of **copy‑paste prompts for Cursor AI** — each one self‑contained, grounded in the real stack, with acceptance criteria so you can verify the output instead of trusting it.

---

## 0. Read this first — honest framing of "₹100 Cr"

Code alone does not create a ₹100 crore valuation. Valuation comes from **revenue, retention, defensibility and traction** — code is the enabler. What this playbook *can* do is remove every technical reason an enterprise buyer, auditor, or investor would say no:

- **Production‑grade**: it won't fall over, leak tenant data, or lose money on payments.
- **Enterprise‑ready**: SSO, audit trails, granular RBAC, SLAs, security posture buyers demand.
- **Investment‑ready**: test coverage, CI/CD, observability, DR, and compliance a diligence team checks.

Pair this with the commercial side (design partners, paid pilots, RERA‑registered developer logos, ARR) — that is what actually compounds into valuation. Treat the numbers in the pitch deck as aspirational until you have signed customers.

---

## How to use these prompts in Cursor

1. **Set up the rules file first.** Paste the `.cursorrules` block (next section) into a file named `.cursorrules` at the repo root. This gives every prompt the project context so you don't repeat it.
2. **Work in Agent mode** (Composer / ⌘‑I → Agent). These prompts assume Cursor can read files, run terminal commands, and edit across the monorepo.
3. **One phase at a time, one PR per prompt.** Don't paste ten prompts at once. Run a prompt, review the diff, run the acceptance checks, commit, then move on.
4. **Always end with the guardrail line** (already in each prompt): *"Do not change unrelated files. Show me the diff and the commands to verify before finalizing."*
5. **Verify, don't trust.** Every prompt has an **Acceptance criteria** block — run those commands yourself. If a check fails, paste the failure back to Cursor.
6. **Keep secrets out of the model.** Never paste real API keys, `.env`, or customer data into Cursor. Use placeholders.

Suggested order: **Phase 0 → 1 → 2 → 3 → 4** are foundational (do these before any launch). **5 → 6 → 9** unlock revenue and enterprise deals. **7 → 8 → 10 → 11** are scale and release.

---

## The `.cursorrules` file (paste once, at repo root)

```
# PropOS — Cursor project rules

## What this is
PropOS is a multi-tenant SaaS ERP for Indian real estate developers.
Monorepo: Turborepo + pnpm workspaces, TypeScript everywhere.
- backend/   NestJS 11 (Express), REST under /api/v1, GraphQL (Apollo), Socket.IO gateway
- frontend/  Next.js 15 App Router, React 19, TanStack Query, Zustand, Radix, Tailwind 4, Recharts
- apps/mobile Expo (React Native), expo-router, consumes REST API
- packages/  @propos/shared-types, @propos/shared-utils, @propos/config
Data: PostgreSQL via Prisma (schema at backend/prisma/schema.prisma, 60+ models),
Redis + BullMQ for cache/queues, AWS S3/CloudFront for documents (signed URLs).
Auth: JWT access+refresh (@nestjs/jwt + passport-jwt), RBAC guards in backend/src/common.
Multi-tenant: every domain row is scoped by tenantId (company). Isolation is critical.

## Non-negotiable rules
1. NEVER write a query in a domain module that is not filtered by tenantId. Tenant
   isolation bugs are P0. When in doubt, add an explicit tenant guard/where clause.
2. Validate all input with class-validator DTOs (backend) and Zod (frontend). No `any`
   on request boundaries.
3. Never log secrets, tokens, passwords, or PII (name+phone+email together). Use the
   project logger, structured, redacted.
4. Money is integer paise (BIGINT), never float. Currency is INR unless specified.
5. Keep changes minimal and reviewable. Don't reformat or touch unrelated files.
6. Every new endpoint needs: DTO validation, RBAC guard, tenant scoping, and a test.
7. Follow existing patterns — look at an existing module (e.g. crm) before adding code.
8. Prisma schema changes ALWAYS via a migration (`prisma migrate dev --name ...`),
   never a silent `db push` in code that others run.

## Definition of done for any task
- Types check: `pnpm -w build`
- Lint clean: `pnpm -w lint`
- Tests pass and cover the new logic: `pnpm --filter @propos/backend test`
- No new tenant-isolation or secret-logging violations.
```

---

# Phase 0 — Ground‑truth audit (do this before anything else)

### Prompt 0.1 — Production‑readiness audit

```
You are auditing the PropOS monorepo for production readiness. Do NOT change code yet.

Produce a report `docs/PROD_READINESS_AUDIT.md` covering:
1. Test coverage: list every module in backend/src/modules and mark which have tests.
   Run the test suite and report current coverage % (add --coverage if needed).
2. Tenant isolation risk: grep every prisma call (findMany/findFirst/update/delete/
   aggregate) in backend/src/modules and flag any that do NOT filter by tenantId.
   Output a table: file, line, method, "scoped?" yes/no.
3. Input validation: list controllers/routes whose handlers take a body without a
   class-validator DTO.
4. Secrets & config: list every process.env / configService.get usage and whether it
   has a documented entry in backend/.env.example.
5. Security headers, CORS, rate limiting, auth guards: confirm where each is applied
   and where it's missing.
6. Error handling: is there a global exception filter? Are errors leaking stack traces?
7. Observability: is there structured logging, request IDs, health/readiness endpoints,
   metrics, error tracking? List what exists and what's missing.
8. Frontend: error boundaries, loading/empty states, accessibility gaps, and any
   fetch calls without error handling.

For each finding assign severity P0/P1/P2 and a one-line fix. End with a prioritized
"first 10 things to fix" list. Do not change unrelated files. Show me the report only.
```

### Prompt 0.2 — Dependency & vulnerability baseline

```
Establish a security baseline for the PropOS monorepo. Do not upgrade anything yet.
1. Run `pnpm audit` at the root and in backend/ and frontend/. Summarize criticals/highs.
2. List dependencies that are >1 major version behind or unmaintained.
3. Check for known-risky patterns: use of `eval`, `child_process`, dynamic `require`,
   disabled TLS verification, `dangerouslySetInnerHTML`, raw SQL string interpolation.
4. Write findings to `docs/SECURITY_BASELINE.md` with a remediation plan grouped by
   effort (quick wins vs. needs testing). Show me the report only.
```

---

# Phase 1 — Test coverage & quality gates

> Today there are only 3 spec files. This is the single biggest diligence red flag. Fix it first.

### Prompt 1.1 — Backend test harness & coverage gate

```
Set up a real testing foundation for backend/ (NestJS 11 + Jest + Prisma).

1. Configure Jest for unit tests and a separate integration test project that runs
   against a throwaway Postgres (use testcontainers OR a docker-compose test db;
   pick whichever is simpler to run in CI and document it).
2. Add a Prisma test helper that spins up a clean schema per test run and truncates
   between tests. Provide a `createTestTenant()` and `createTestUser(role)` factory.
3. Add coverage reporting (text + lcov) and set a coverage threshold of 70% lines/
   statements to start (we'll raise it later). Wire `pnpm --filter @propos/backend
   test:cov`.
4. Write example tests to prove the harness: full unit test for AuthService (login,
   refresh, invalid credentials, locked/inactive user) and an integration test for the
   CRM leads controller (create → list → assign → archive) asserting tenant scoping.

Constraints: use the existing DI patterns; mock external services (OpenAI, S3, email).
Do not weaken any existing test. Acceptance: `pnpm --filter @propos/backend test:cov`
passes and prints coverage. Show me the diff and the exact commands to run.
```

### Prompt 1.2 — Tenant‑isolation test suite (P0)

```
Create a dedicated integration test suite `test/tenant-isolation.e2e-spec.ts` in backend/
that proves cross-tenant data cannot leak.

For each major module (crm, sales, construction, hr, finance, vendors, documents,
legal, assets, marketing, channel-partners, lms):
- Seed two tenants A and B, each with one record.
- As a user of tenant A, attempt to GET/PUT/DELETE tenant B's record by id.
- Assert every attempt returns 404/403 and never B's data.
- Assert list endpoints only ever return the caller's tenant rows.

Generate this table-driven so adding a module is one line. If any endpoint leaks,
FAIL the test (do not fix the endpoint in this prompt — just expose it). Then give me
a list of the leaking endpoints. Acceptance: the suite runs and clearly reports pass/
fail per module. Show me the diff.
```

### Prompt 1.3 — Frontend + E2E tests

```
Add frontend testing to PropOS.
1. Vitest + React Testing Library for frontend/ unit/component tests. Add example tests
   for the CRM pipeline board (drag reorder updates stage) and a form with Zod validation.
2. Playwright end-to-end tests running against the full docker-compose stack. Cover the
   golden path: login → create lead → schedule follow-up → move to booking → see it on
   the sales dashboard. Include one multi-tenant test (two orgs, no cross visibility).
3. Add `pnpm test:e2e` and make Playwright produce a trace + video on failure.
Acceptance: `pnpm --filter @propos/frontend test` and `pnpm test:e2e` both pass locally
against docker-compose. Show me the diff and run commands.
```

### Prompt 1.4 — Quality gates in CI

```
Upgrade .github/workflows/ci.yml into a real quality gate. Keep it fast with caching.
Add jobs (parallel where possible):
- lint + typecheck (tsc --noEmit across workspaces)
- backend unit + integration tests with a Postgres service container, upload coverage
- frontend unit tests
- e2e (Playwright) on PRs to main, using docker-compose, artifacts on failure
- `pnpm audit --audit-level=high` (non-blocking warn for now)
- prisma migration check: fail if schema.prisma changed without a matching migration
Require all required checks to pass before merge (document the branch protection to set).
Acceptance: show the new workflow and explain each job. Do not remove existing steps.
```

---

# Phase 2 — Security hardening

### Prompt 2.1 — Auth & session hardening

```
Harden authentication in backend/ without breaking existing clients.
1. Enforce strong password policy on registration/change (length, entropy) via DTO.
2. Hash passwords with bcrypt cost >=12 (confirm current cost; raise if lower).
3. Implement refresh-token rotation with reuse detection: store a hashed refresh token
   per session, rotate on use, revoke the whole session family on reuse. Add a
   `sessions` table via prisma migration.
4. Add account lockout / exponential backoff after N failed logins (per user + per IP),
   backed by Redis.
5. Add `POST /auth/logout` (revoke current session) and `/auth/logout-all`.
6. Ensure JWT secrets fail fast at boot if missing or equal to the .env.example
   placeholder in production (NODE_ENV=production).
Constraints: keep access-token payload minimal (sub, tenantId, roles). Add tests for
rotation, reuse detection, and lockout. Acceptance: auth tests pass; show the migration
and diff.
```

### Prompt 2.2 — Authorization / RBAC depth

```
Strengthen RBAC across PropOS.
1. Audit the existing role guard in backend/src/common. Introduce a permission model
   (role -> permissions) so we can grant granular access (e.g. crm:lead:read,
   finance:ledger:write) instead of coarse roles. Seed default role->permission maps.
2. Add a `@RequirePermissions(...)` decorator + guard and apply it to finance, hr, and
   admin endpoints first (highest sensitivity).
3. Add object-level checks where needed (a rep can only edit leads assigned to them
   unless they are a manager).
4. Write tests: each sensitive endpoint denies a user lacking the permission.
Do not break existing role checks; layer permissions on top. Show the migration, the
guard, and tests.
```

### Prompt 2.3 — Input, output & transport security

```
Apply defense-in-depth to the backend API.
1. Confirm helmet, CORS allowlist (from CORS_ORIGINS), and @nestjs/throttler are active
   globally; add per-route stricter limits on auth and file endpoints.
2. Add a global ValidationPipe with { whitelist: true, forbidNonWhitelisted: true,
   transform: true } and confirm every controller uses DTOs.
3. Add a global exception filter that returns RFC-7807-style problem+json, hides stack
   traces in production, and attaches a request id.
4. Add request-id middleware (propagate x-request-id) and structured request logging
   with secrets/PII redaction.
5. Enforce max body size and file-type/size validation on uploads; scan filenames;
   store to S3 with signed URLs only (confirm no public buckets).
Add tests for validation rejection and error-shape. Show the diff.
```

### Prompt 2.4 — Secrets, audit log & data protection

```
1. Add an append-only `AuditLog` model (tenantId, actorId, action, entity, entityId,
   before/after diff hash, ip, ua, timestamp) via prisma migration. Emit audit events
   from an interceptor for all create/update/delete on sensitive entities (bookings,
   payments, ledger, users, documents, legal). Never store raw PII in the diff — store
   changed field names + hashes.
2. Encrypt PII-at-rest for the most sensitive columns (customer PAN, Aadhaar-last-4,
   bank details) using envelope encryption (KMS or an app-level AES-256-GCM key from
   env). Provide migration + transparent encrypt/decrypt in the Prisma layer.
3. Add a startup check that refuses to boot in production if any secret equals its
   .env.example placeholder.
Acceptance: audit rows are written on a booking update; encrypted columns are ciphertext
in the DB and plaintext via the API. Show migrations, code, and tests.
```

---

# Phase 3 — Multi‑tenant isolation (make it bulletproof)

### Prompt 3.1 — Enforce tenant scoping structurally

```
Make tenant isolation impossible to forget in PropOS backend.
1. Introduce a request-scoped TenantContext (from the JWT tenantId) available via DI.
2. Add a Prisma middleware/extension that automatically injects `tenantId` into where-
   clauses for all tenant-owned models and rejects writes missing a tenantId. Keep an
   explicit allowlist for genuinely global models (e.g. system config).
3. Refactor any query flagged by Phase 0/1.2 that isn't tenant-scoped to use the
   enforced path. Add a lint/test that fails if a tenant-owned model is queried outside
   the enforced client.
4. Consider PostgreSQL Row-Level Security as defense-in-depth: generate the policies and
   a migration, gated behind a flag, and document the tradeoffs.
Acceptance: the Phase 1.2 tenant-isolation suite goes fully green. Show diffs + how RLS
is enabled.
```

### Prompt 3.2 — Per‑tenant limits & fairness

```
Prevent noisy-neighbor problems.
1. Add per-tenant rate limiting and per-tenant BullMQ queue concurrency caps so one org
   can't starve others.
2. Add per-tenant usage counters (API calls, storage, seats) in Redis, surfaced on an
   admin endpoint. These become the basis for plan limits/billing in Phase 5.
Acceptance: load a single tenant hard and confirm others are unaffected (include a small
k6 script). Show the diff.
```

---

# Phase 4 — Observability & reliability

### Prompt 4.1 — Structured logging, tracing, metrics

```
Add production observability to backend/ (and propagate to frontend where relevant).
1. Structured logging with pino (JSON), request id + tenant id on every log, PII/secret
   redaction, log levels via env.
2. OpenTelemetry tracing (HTTP, Prisma, Redis, BullMQ) exporting OTLP; document how to
   point it at any collector (Jaeger/Tempo/Datadog).
3. Prometheus metrics endpoint (`/metrics`): request rate/latency/error, queue depth,
   DB pool usage, event-loop lag. Guard it (internal only).
4. Integrate Sentry (or self-hosted GlitchTip) for backend + Next.js frontend with
   release + tenant tags; scrub PII.
Constraints: everything toggleable by env; zero-config no-op in dev. Show the diff and a
sample trace/log.
```

### Prompt 4.2 — Health, readiness & graceful shutdown

```
1. Add `/health/live` (process up) and `/health/ready` (checks Postgres, Redis, S3,
   and migration status) using @nestjs/terminus.
2. Implement graceful shutdown: stop accepting traffic, drain in-flight requests and
   BullMQ jobs, close DB/Redis, within a timeout. Wire SIGTERM.
3. Add readiness gating so orchestrators don't route traffic before migrations/warm-up.
Acceptance: hitting the endpoints returns correct states; killing the pod drains cleanly.
Show diffs and the Dockerfile/compose health-check wiring.
```

### Prompt 4.3 — Backups, DR & data lifecycle

```
Design and script disaster recovery for PropOS data.
1. Document RPO/RTO targets and a backup strategy: automated Postgres backups + PITR,
   S3 versioning + lifecycle, Redis persistence stance.
2. Provide scripts: `scripts/backup.sh`, `scripts/restore.sh` (to a scratch DB), and a
   `scripts/verify-restore.sh` that proves a backup restores and the app boots against it.
3. Add a documented, tested tenant-level export (GDPR/DPDP data portability) and a
   tenant hard-delete (right-to-erasure) that also purges S3 objects and audit-safe logs.
Write `docs/DR_RUNBOOK.md`. Acceptance: restore script recreates a working DB from a
backup locally. Show scripts + runbook.
```

---

# Phase 5 — Payments, plans & billing (revenue engine)

> There are `payments` and `payment-plans` modules but no gateway SDK. Wire real money in with idempotency and reconciliation.

### Prompt 5.1 — Razorpay integration (Indian gateway)

```
Integrate Razorpay for customer payments against bookings in backend/sales.
1. Add a payments provider abstraction (interface) with a Razorpay implementation so we
   can add PayU/Stripe later. Keep keys in env.
2. Create order on booking demand; verify payment signature server-side; store money as
   integer paise; link payment -> installment (payment-plan schedule) -> booking ->
   ledger entry.
3. Handle webhooks with signature verification and IDEMPOTENCY (dedupe by event id);
   reconcile captured/failed/refunded; never trust client-side success alone.
4. Support partial payments, refunds, and a reconciliation report (gateway settlement
   vs. ledger).
Add tests with a mocked gateway for: happy path, replayed webhook (idempotent), signature
mismatch (rejected), refund. Never log full card/UPI data. Show migration + diff.
```

### Prompt 5.2 — Subscription billing & plan limits (your SaaS revenue)

```
Add SaaS subscription billing so PropOS itself earns recurring revenue.
1. Model Plans (Starter/Growth/Enterprise) with entitlements: seats, projects, storage
   GB, API limits, feature flags. Reuse the per-tenant usage counters from Phase 3.2.
2. Enforce entitlements at the guard level (block over-limit actions with a clear upgrade
   error). Add a billing admin page spec for the frontend.
3. Integrate recurring billing (Razorpay Subscriptions or Stripe Billing) with proration,
   invoices (GST-compliant, see Phase 6), dunning, and trial handling.
4. Emit usage + MRR/churn events for analytics.
Acceptance: a tenant on Starter is blocked from exceeding seat limit; upgrading lifts it.
Tests for entitlement enforcement + webhook idempotency. Show the diff.
```

---

# Phase 6 — Indian real‑estate compliance (deal‑closers for developer buyers)

### Prompt 6.1 — GST e‑invoicing & TDS

```
Add GST-compliant invoicing to PropOS finance.
1. Generate tax invoices with GSTIN, HSN/SAC, CGST/SGST/IGST split by place-of-supply,
   invoice numbering per statutory rules, and INR amounts in paise.
2. Integrate GST e-invoice (IRN/QR) via a pluggable provider interface (start with a
   sandbox/mock; real GSP behind env keys). Store IRN + signed QR on the invoice.
3. Handle TDS on applicable payments and produce the data needed for TDS returns.
4. Produce GSTR-ready export (sales register). Keep everything auditable.
Add tests for tax computation across intra/inter-state cases. Show migration + diff and
note which parts need a licensed GSP in production.
```

### Prompt 6.2 — RERA, agreements & e‑sign

```
Add real-estate statutory features developers expect.
1. RERA: capture RERA registration numbers per project, track disclosure fields, and
   flag units/bookings against RERA carpet-area and payment-stage rules (payment can't
   exceed X% before defined construction stages).
2. Agreement generation: template-driven Agreement to Sell / allotment letters merged
   with booking data to PDF, stored in the document vault with versioning.
3. E-signature: integrate a pluggable e-sign provider (interface; implement one of
   Leegality/Digio/DocuSign) with webhook status back into the document + audit log.
Add tests for the RERA payment-stage rule engine. Show the diff and provider interface.
```

### Prompt 6.3 — DPDP Act 2023 / data residency

```
Make PropOS defensible on Indian data-protection (DPDP Act 2023).
1. Add a consent + purpose registry for customer PII; record consent with timestamp and
   purpose; expose consent status per customer.
2. Implement data-subject rights endpoints: access/export, correction, erasure (tie to
   Phase 4.3 tenant export/delete but at the individual level).
3. Document data residency (ap-south-1) and add config guards preventing storage outside
   the configured region. Write `docs/DPDP_COMPLIANCE.md` mapping each requirement to code.
Show the diff and the compliance doc.
```

---

# Phase 7 — Performance & scale

### Prompt 7.1 — Database performance

```
Optimize the PostgreSQL/Prisma layer for scale.
1. Find and fix N+1 queries in hot paths (CRM lists, dashboards, LMS data feed). Use
   Prisma `include`/`select` deliberately; add pagination (cursor-based) everywhere lists
   can grow.
2. Review indexes against real query patterns; add composite indexes (tenantId + common
   filters/sort). Provide migrations.
3. Add connection pooling guidance (PgBouncer) and set sane Prisma pool limits.
4. Add slow-query logging in non-prod and a short `docs/DB_PERF.md` of findings.
Acceptance: show before/after query counts/timings for the CRM leads list and the CRM
dashboard. Show migrations + diff.
```

### Prompt 7.2 — Caching, realtime & load testing

```
1. Introduce a caching layer (Redis) for expensive reads (dashboards, KPI aggregates,
   inventory availability) with explicit invalidation on writes. Prevent cache-stampede.
2. Harden the Socket.IO LMS data feed for horizontal scale: use the Redis adapter, make
   claim/release atomic (Redis lock) so two reps can't claim the same lead, and
   authenticate/authorize socket connections per tenant.
3. Add k6 load tests for: login, CRM list, booking creation, and the realtime feed.
   Define target throughput/latency SLOs and report results in `docs/LOAD_TEST.md`.
Acceptance: k6 scripts run and meet stated SLOs on docker-compose; show the diff.
```

---

# Phase 8 — Infrastructure, CI/CD & deployment

### Prompt 8.1 — Container & image hardening

```
Make the backend and frontend Dockerfiles production-grade.
1. Multi-stage builds, non-root user, distroless or slim base, pinned digests, no dev
   deps in the final image, healthchecks, and small final size. Build with the pnpm
   workspace correctly (prune to the target app).
2. Add `.dockerignore`s. Add container vulnerability scanning (Trivy) to CI, failing on
   HIGH/CRITICAL with an allowlist file.
3. Produce a production `docker-compose.prod.yml` (or confirm the full compose) with
   Postgres, Redis, API, web, and a reverse proxy (Caddy/Traefik) terminating TLS.
Acceptance: images build, run as non-root, pass Trivy. Show diffs and image sizes.
```

### Prompt 8.2 — Infrastructure as Code & orchestration

```
Provide deployable infrastructure for PropOS. Pick ONE target and implement it fully;
recommend the simplest that meets "enterprise-ready" (AWS ECS Fargate + RDS + ElastiCache
+ S3 + CloudFront, OR Kubernetes). Ask me to confirm the target if unsure.
1. Terraform for: network/VPC, managed Postgres (Multi-AZ, PITR), managed Redis, object
   storage + CDN, secrets manager, the app services with autoscaling, a WAF, and logging.
2. Zero-downtime deploys (rolling/blue-green) with automated DB migrations run as a
   pre-deploy job (not at app boot). Rollback procedure documented.
3. Environments: dev/staging/prod with separate state and least-privilege IAM.
Write `docs/DEPLOYMENT.md`. Acceptance: `terraform plan` is clean; explain the topology.
Show the IaC and doc.
```

### Prompt 8.3 — CD pipeline & release management

```
Build the CD half of the pipeline.
1. On merge to main: build+scan images, push to registry, deploy to staging, run smoke +
   e2e, then require manual approval to promote to prod (blue-green) with auto-rollback on
   health-check failure.
2. Run DB migrations as a gated pre-deploy step; block deploy if a migration is
   destructive without an explicit approved flag.
3. Semantic versioning + auto-generated changelog + release notes. Tag images with the
   release.
Acceptance: a dummy change flows to staging automatically and waits for approval. Show
the workflow(s) and document required secrets (as names only).
```

---

# Phase 9 — Enterprise features that actually move valuation

### Prompt 9.1 — SSO / SAML / SCIM

```
Add enterprise identity to PropOS (top ask in enterprise procurement).
1. SSO via OIDC and SAML 2.0 (support Google Workspace, Microsoft Entra, Okta) with
   per-tenant IdP config. Just-in-time user provisioning mapped to roles.
2. SCIM 2.0 endpoints for automated user provisioning/deprovisioning.
3. Enforce SSO-only mode per tenant (disable password login when required).
Keep the existing JWT sessions as the internal token. Add tests for SAML assertion
handling and JIT provisioning. Show the migration + diff.
```

### Prompt 9.2 — Admin console, feature flags & impersonation

```
1. Build a super-admin console (separate guarded surface) to manage tenants, plans,
   usage, feature flags, and to view (not edit) audit logs.
2. Add a feature-flag service (per-tenant + global) so features can be rolled out safely;
   wire a few existing modules behind flags.
3. Add secure, fully-audited support impersonation ("view as tenant admin") with a
   visible banner, time limit, and every action logged to the AuditLog.
Acceptance: flags toggle behavior without deploy; impersonation writes audit rows. Show
the diff.
```

### Prompt 9.3 — Public API platform & webhooks

```
Turn PropOS into a platform (drives stickiness + partner ecosystem = valuation).
1. Add tenant-scoped API keys (hashed, scoped to permissions, rotatable) for programmatic
   access, separate from user JWTs.
2. Generate and publish OpenAPI 3 docs (Swagger UI) for the REST API, versioned under
   /api/v1, with examples.
3. Add outbound webhooks (tenant-configurable) for key events (lead.created,
   booking.confirmed, payment.captured) with signed payloads, retries, and a delivery log.
Add tests for key auth, scope enforcement, and webhook signing/retry. Show the diff.
```

---

# Phase 10 — Mobile release pipeline (Expo)

### Prompt 10.1 — Mobile production build & OTA

```
Make apps/mobile production-releasable.
1. Configure EAS Build profiles (dev/preview/production) and EAS Submit for Play Store +
   App Store. Set up app signing and bundle identifiers.
2. Add EAS Update (OTA) channels tied to release branches, with a rollback path.
3. Add crash/error reporting (Sentry RN), secure token storage (expo-secure-store),
   certificate pinning for the API, and environment config per profile.
4. Add a minimal Detox/Maestro smoke test (login + view leads) in CI.
Acceptance: `eas build --profile preview` succeeds; document the store-submission steps.
Show the config and diff.
```

---

# Phase 11 — Release‑readiness checklist (final gate)

### Prompt 11.1 — Generate the go‑live runbook

```
Create `docs/GO_LIVE_CHECKLIST.md` for PropOS covering, with a checkbox per item and the
command/owner to verify each:
- Security: secrets rotated, no placeholder secrets in prod, WAF on, rate limits on,
  dependency + container scans green, pen-test findings triaged.
- Data: migrations applied, backups + PITR verified by a real restore, DR runbook tested.
- Reliability: health/readiness live, graceful shutdown verified, autoscaling tested,
  load test meets SLOs, alerting + on-call wired (Sentry/Prometheus/paging).
- Tenancy: isolation suite green, per-tenant limits on.
- Payments/compliance: gateway in live mode with reconciliation, GST e-invoice live,
  RERA rules on, DPDP rights endpoints working, consent capture on.
- Observability: dashboards + alerts for latency/error/queue/DB, log retention set.
- Legal/ops: ToS, privacy policy, DPA template, status page, support workflow, SLAs.
- Rollback: documented and rehearsed.
Then generate a one-page `docs/ARCHITECTURE_FOR_DILIGENCE.md` an investor/CTO can read
in 5 minutes. Show both docs.
```

### Prompt 11.2 — Security review pass

```
Do a focused security review of the whole PropOS backend as if you were an external
auditor. Check the OWASP API Top 10 against the code: broken object-level auth (tenant +
object scoping), broken auth, excessive data exposure, resource limits, mass assignment,
security misconfig, injection, improper asset management, insufficient logging. Produce
`docs/SECURITY_REVIEW.md` with findings (severity + file:line + fix) and open a fix task
list. Do not change code in this pass — report only.
```

---

## Appendix A — A reusable prompt pattern

When you need something not covered above, use this skeleton so Cursor stays grounded and reviewable:

```
Context: <which app/module, which files, current behavior>
Goal: <the outcome in one sentence>
Task:
  1. <step>
  2. <step>
Constraints:
  - Follow .cursorrules (tenant scoping, DTO validation, money as paise, minimal diff).
  - Reuse existing patterns from <reference module>.
  - Add/extend tests for the new logic.
Acceptance criteria:
  - <command that must pass>
  - <observable behavior>
Do not change unrelated files. Show me the diff and the commands to verify before finalizing.
```

## Appendix B — Recommended execution order & rough effort

| Order | Phase | Why it's here | Effort |
|------|-------|---------------|--------|
| 1 | 0 Audit | Know the truth before touching anything | S |
| 2 | 1 Tests + CI gates | Biggest diligence gap; protects everything after | L |
| 3 | 2 Security | Table stakes; blocks enterprise deals if missing | L |
| 4 | 3 Tenancy | A single leak kills the product | M |
| 5 | 4 Observability + DR | You can't run what you can't see or recover | M |
| 6 | 5 Payments + billing | Turns it into a revenue engine | L |
| 7 | 6 Compliance | Closes Indian developer + enterprise deals | L |
| 8 | 9 Enterprise (SSO, API, admin) | Moves ACV and valuation | L |
| 9 | 7 Performance | Needed as tenants grow | M |
| 10 | 8 Infra/CD | Repeatable, safe deploys | L |
| 11 | 10 Mobile | Ship the app stores | M |
| 12 | 11 Release gate | Final go-live confidence | S |

*S ≈ hours, M ≈ days, L ≈ 1–2+ weeks with an engineer reviewing every AI diff. Do not let Cursor merge unreviewed — the acceptance checks exist for that reason.*

## Appendix C — What to say no to (so quality holds)

- Don't let the AI **lower a coverage threshold** to make CI pass — fix the test.
- Don't accept a diff that **queries a tenant model without tenantId** — it's a P0.
- Don't accept **floats for money**, **secrets in logs**, or **stack traces in prod responses**.
- Don't skip **migrations** for schema changes.
- Don't ship a feature **without a test and an entry in the go‑live checklist**.

---

*Prepared for the PropOS platform. Built by Nexovo Tech Services Pvt. Ltd. · technexovo.com*
