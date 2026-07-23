# PropOS RERA, agreements & e-sign (Phase 6.2)

Statutory features developers expect: RERA registration/disclosure, payment-stage
collection caps, template-driven Agreement to Sell / allotment PDFs in the
document vault, and pluggable e-signature with webhook status.

## Features

1. **RERA** — `ReraProjectProfile` (registration number, disclosure JSON, carpet
   area, parking counts) synced to `Project.reraNumber`. `ReraPaymentStage` rows
   define max cumulative % (basis points) collectible per construction stage.
   Compliance report flags units missing carpet area and bookings over the stage cap.
2. **Agreements** — `AgreementTemplate` with `{{placeholders}}`; merge → PDF via
   `PdfService`; store/version in `Document` + `DocumentVersion`; link on `Agreement`.
3. **E-sign** — `ESignProvider` interface; default **Mock** adapter. Digio stub when
   `ESIGN_PROVIDER=digio` and keys present (throws until HTTP adapter is wired).
   Webhook updates `ESignRequest` + optional `Agreement.status=SIGNED` and audit log.

## Models

| Model | Notes |
|-------|--------|
| `ReraProjectProfile` | Per-project RERA + disclosures (`tenantId`) |
| `ReraPaymentStage` | Stage caps in bps; `isCompleted` drives applicable cap |
| `AgreementTemplate` | Tenant templates for ALLOTMENT / SALE / REGISTRATION |
| `Agreement` | + `documentId`, `templateId`, `version`, `updatedAt` |
| `ESignRequest` | Provider request + status lifecycle |

Migration: `20260723220000_rera_agreements_esign`

```bash
pnpm --filter @propos/backend exec prisma migrate deploy
```

If Postgres is down (e.g. `localhost:51218`), apply when the DB is up.

## API

| Method | Path | Permission |
|--------|------|------------|
| GET/PUT | `/api/v1/legal/rera/projects/:projectId` | `legal:read/write:rera` |
| GET/PUT | `/api/v1/legal/rera/projects/:projectId/stages` | `legal:read/write:rera` |
| PATCH | `/api/v1/legal/rera/projects/:projectId/stages/:stageId` | `legal:write:rera` |
| POST | `/api/v1/legal/rera/projects/:projectId/check-payment` | `legal:read:rera` |
| GET | `/api/v1/legal/rera/projects/:projectId/compliance` | `legal:read:rera` |
| GET/POST/PATCH | `/api/v1/legal/agreements/templates` | `legal:read/write:agreements` |
| POST | `/api/v1/legal/agreements/generate` | `legal:write:agreements` |
| GET/POST | `/api/v1/legal/esign` | `legal:read/write:esign` |
| POST | `/api/v1/legal/esign/webhook` | public (HMAC) |

Existing booking agreement PDF (`POST /sales/bookings/:id/agreement`) still works;
prefer `/legal/agreements/generate` for template + vault versioning.

## Payment-stage rule engine

```
evaluatePaymentStageRule({ totalPaise, alreadyPaidPaise, proposedPaise, stages })
  → applicable stage = last completed (else first / booking)
  → maxAllowed = total * maxCumulativePctBps / 10000 (half-up)
  → allowed iff alreadyPaid + proposed ≤ maxAllowed
```

Pure module: `backend/src/modules/legal/rera/rera-rules.ts` (unit-tested).

## E-sign provider interface

```
ESignService
  → ESIGN_PROVIDER (Nest token)
      → MockESignAdapter     (default: ESIGN_PROVIDER=mock)
      → DigioStubAdapter     (ESIGN_PROVIDER=digio + DIGIO_* keys — stub)
```

Env (see `backend/.env.example`):

```
ESIGN_PROVIDER=mock
ESIGN_WEBHOOK_SECRET=
PUBLIC_API_URL=http://localhost:3001/api/v1
DIGIO_CLIENT_ID=
DIGIO_CLIENT_SECRET=
DIGIO_BASE_URL=
```

Webhook header: `x-esign-signature` = HMAC-SHA256 hex of raw body with
`ESIGN_WEBHOOK_SECRET`. Mock payload:

```json
{ "providerRequestId": "…", "status": "SIGNED", "signedFileUrl": "/storage/…" }
```

**Production** needs a licensed Digio / Leegality / DocuSign integration implementing
`ESignProvider` (`createSigningRequest`, `verifyWebhook`, `parseWebhook`).
