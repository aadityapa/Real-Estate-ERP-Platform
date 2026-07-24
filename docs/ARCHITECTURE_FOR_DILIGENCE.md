# PropOS architecture for diligence (Phase 11.1)

**One-pager for investors / CTO review · India real-estate ERP SaaS**

## What it is

PropOS is a multi-tenant ERP for Indian real-estate developers: CRM/LMS, sales bookings & inventory, finance (GST/TDS), RERA agreements, HR, and field mobile — sold as SaaS with plan entitlements.

## Stack

| Layer | Choice |
|-------|--------|
| API | NestJS 11, REST `/api/v1` + GraphQL, Socket.IO |
| Web | Next.js 15 App Router |
| Mobile | Expo (EAS Build / Update) |
| Data | PostgreSQL (Prisma), Redis (cache, queues, Socket.IO adapter) |
| Files | S3 + CloudFront signed URLs |
| Deploy | AWS ECS Fargate, RDS Multi-AZ, ElastiCache, ALB+WAF (Terraform) |

## Multi-tenancy & security

- Every domain row scoped by `tenantId`; Prisma extension + optional RLS; isolation tests.
- JWT access/refresh with rotation; RBAC permissions; SSO (OIDC/SAML) + SCIM; API keys.
- PII encryption at rest; append-only AuditLog; DPDP export/erase; India residency (`ap-south-1`).
- Helmet, CORS allowlist, throttling, Trivy + dependency gates in CI.

## Money & compliance

- INR as integer **paise** (BIGINT) end-to-end.
- Razorpay gateway + SaaS subscriptions; GST e-invoice + TDS; RERA payment-stage caps; e-sign.

## Reliability

- Health live/ready; structured logs + OTel + Prometheus + Sentry.
- Backups/DR runbook (RPO 15m / RTO 4h); migrate-before-deploy CD; ECS circuit-breaker rollback.
- Redis caching + k6 SLOs documented.

## Commercial surface

- Plan limits (seats/projects/RPM/features); feature flags; platform admin + audited impersonation.
- Public API keys + signed webhooks; OpenAPI at `/api/docs`.

## Proof points

See `docs/PROD_READINESS_AUDIT.md`, `docs/SECURITY_REVIEW.md`, `docs/GO_LIVE_CHECKLIST.md`, and CI on `main`.
