# PropOS DPDP Act 2023 compliance map (Phase 6.3)

This document maps Indian Digital Personal Data Protection Act 2023 obligations
to PropOS code. It is an engineering control map — not legal advice.

**Data residency default:** `ap-south-1` (Mumbai). Override only via
`DATA_RESIDENCY_REGION` (must match `AWS_REGION` when S3 is used).

## Requirement → code

| DPDP theme | Control in PropOS | Where |
|------------|-------------------|--------|
| Purpose limitation / consent | Purpose catalog + per-customer consent with timestamp, channel, notice version | `ConsentPurpose`, `CustomerConsent`; `POST /privacy/customers/:id/consents` |
| Consent status | Read registry + grant/deny state per purpose | `GET /privacy/purposes`, `GET /privacy/customers/:id/consents` |
| Right of access / portability | Individual export package (customer + consents + bookings metadata) | `GET /privacy/customers/:id/export` (ties to tenant export in Phase 4.3) |
| Right to correction | Validated PII update + DSR audit row | `PATCH /privacy/customers/:id` |
| Right to erasure | PII scrub + `erasedAt`; bookings retained for legal/RERA/tax | `DELETE /privacy/customers/:id` with `confirmCustomerId` |
| Tenant-level erasure | Full tenant hard-delete + storage purge | `DELETE /admin/lifecycle` (Phase 4.3) |
| Security safeguards | AES-256-GCM PII at rest; audit hashes only; no PII in logs | Phase 2.4 `pii-crypto`, `AuditInterceptor`, pino redact |
| Tenant isolation | Every customer/consent/DSR query scoped by `tenantId` | Prisma tenant extension + `DIRECT_TENANT_MODELS` |
| Data residency (India) | Config guards reject non-residency `AWS_REGION` / S3 URLs | `common/residency/data-residency.ts`; boot in `main.ts`; document create/update |
| Accountability | `DataSubjectRequest` rows for ACCESS / CORRECTION / ERASURE | Prisma model + privacy service |

## Models

| Model | Scope | Notes |
|-------|--------|--------|
| `ConsentPurpose` | Global | Seeded codes: `SERVICE_DELIVERY`, `KYC_VERIFICATION`, `MARKETING`, `ANALYTICS`, `LEGAL_COMPLIANCE`, `THIRD_PARTY_SHARING` |
| `CustomerConsent` | `tenantId` | Unique per (tenant, customer, purpose) |
| `DataSubjectRequest` | `tenantId` | Rights request audit (no name/phone/email in `notes`) |
| `Customer.erasedAt` | `tenantId` | Marks scrubbed principal; phone becomes `erased-{id}` |

Migration: `20260723230000_dpdp_consent_residency`

```bash
pnpm --filter @propos/backend exec prisma migrate deploy
```

If Postgres is down (e.g. `localhost:51218`), apply when the DB is up.

## API

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/v1/privacy/purposes` | `privacy:read:consent` |
| GET | `/api/v1/privacy/customers/:id/consents` | `privacy:read:consent` |
| POST | `/api/v1/privacy/customers/:id/consents` | `privacy:write:consent` |
| GET | `/api/v1/privacy/customers/:id/export` | `privacy:export:customer` |
| PATCH | `/api/v1/privacy/customers/:id` | `privacy:correct:customer` |
| DELETE | `/api/v1/privacy/customers/:id` | `privacy:erase:customer` |
| GET | `/api/v1/privacy/residency` | `privacy:read:residency` |

Tenant-level (Phase 4.3):

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/v1/admin/lifecycle/export` | `admin:export:tenant` |
| DELETE | `/api/v1/admin/lifecycle` | `admin:delete:tenant` |

## Residency env

```bash
DATA_RESIDENCY_REGION=ap-south-1   # default if unset
AWS_REGION=ap-south-1              # must match when S3 configured
AWS_S3_BUCKET=propos-documents
```

Boot (`main.ts`) calls `assertProductionResidencyConfigured` + `assertStorageRegionAllowed`.
Document `fileUrl` writes call `assertStorageUrlRegionAllowed`. Use
`buildResidencyS3ObjectUrl(key)` when constructing new object URLs.

## Erasure semantics

Individual erasure **scrubs** personal fields and sets `erasedAt`. It does **not**
delete booking / payment / GST rows (statutory retention). Consent rows for that
customer are deleted. Tenant hard-delete (4.3) remains the path to remove an
entire organisation including storage objects.

## Logging

Consent / export / erasure logs use `customerId` + purpose codes only — never
name + phone + email together.
