# PropOS GST e-invoicing & TDS (Phase 6.1)

GST-compliant tax invoices, e-invoice (IRN/QR) via a pluggable IRP adapter,
TDS entries for returns, and GSTR-1–ready sales register export.

Money is always **integer paise** (`BIGINT`). Every row is scoped by `tenantId`.

## Features

1. **Tax invoices** — GSTIN, HSN/SAC line items, CGST/SGST (intra-state) or IGST
   (inter-state) by place-of-supply, statutory numbering `PREFIX/FY/SEQ`
   (e.g. `INV/2526/000001`).
2. **E-invoice (IRN/QR)** — `GstIrpProvider` interface; default **Mock IRP**
   for sandbox/CI. Store `irn`, `irnAckNo`, `irnAckDate`, `signedQr` on
   `GSTInvoice`.
3. **TDS** — accrue deductions (194IA / 194C / 194J / …) in paise; quarterly
   return export for filing worksheets.
4. **GSTR-1 export** — sales register JSON with taxable / CGST / SGST / IGST
   totals for a FY (+ optional quarter).
5. **SaaS reuse** — when `PROPOS_SUPPLIER_GSTIN` is set, paid `SaasInvoice`
   rows (Phase 5.2) get a linked `GSTInvoice` (SAC `998314`, 18%).

## Models

| Model | Notes |
|-------|--------|
| `GSTInvoice` | Tax invoice + IRN fields; FK to `SaasInvoice` / optional `receiptId` |
| `TdsEntry` | TDS accrual / challan / return rows |
| `Company.stateCode` | Optional 2-digit GST state (else derived from GSTIN) |

Migration: `20260723210000_gst_einvoice_tds`

```bash
pnpm --filter @propos/backend exec prisma migrate deploy
```

If Postgres is down (e.g. `localhost:51218`), apply when the DB is up.

## API

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/v1/finance/gst` | `finance:read:gst` |
| GET | `/api/v1/finance/gst/:id` | `finance:read:gst` |
| POST | `/api/v1/finance/gst` | `finance:write:gst` |
| POST | `/api/v1/finance/gst/:id/e-invoice` | `finance:write:gst` |
| POST | `/api/v1/finance/gst/:id/e-invoice/cancel` | `finance:write:gst` |
| GET | `/api/v1/finance/gst/export/gstr1` | `finance:read:gst` |
| GET | `/api/v1/finance/tds` | `finance:read:tds` |
| GET | `/api/v1/finance/tds/:id` | `finance:read:tds` |
| POST | `/api/v1/finance/tds` | `finance:write:tds` |
| PATCH | `/api/v1/finance/tds/:id` | `finance:write:tds` |
| GET | `/api/v1/finance/tds/export/return` | `finance:read:tds` |

Mutating GST/TDS routes are audited via `AuditInterceptor`.

## IRP / GSP integration approach

```
GstInvoiceService
    → GST_IRP_PROVIDER (Nest token)
        → MockIrpAdapter          (default: GST_IRP_PROVIDER=mock)
        → LicensedGspStubAdapter  (GST_IRP_PROVIDER=gsp — throws until wired)
```

**Mock IRP** (`backend/src/modules/finance/gst/irp/mock-irp.adapter.ts`):
deterministic SHA-256 IRN + base64 “signed QR” JSON. No network. Safe for
tests and local demos.

**Production** requires a **licensed GSP** (ClearTax, IRIS Invictus, Masters
India, etc.) that talks to NIC IRP. Wire a real adapter implementing
`GstIrpProvider`, set:

```
GST_IRP_PROVIDER=gsp   # or your adapter key
GST_GSP_API_KEY=       # vendor API key
GST_GSP_BASE_URL=      # vendor base URL
GST_GSP_CLIENT_ID=
GST_GSP_CLIENT_SECRET=
```

Until that client ships, `LicensedGspStubAdapter` refuses IRN generation so
we never pretend a live NIC submission happened.

### What needs a licensed GSP in production

| Capability | Mock | Live GSP required |
|------------|------|-------------------|
| Tax split / invoice PDF data | Yes | No (local) |
| IRN generation / signed QR | Fake | **Yes** |
| IRN cancel on IRP | Fake | **Yes** |
| E-way bill (out of scope 6.1) | — | Yes (separate) |
| GSTR JSON push to GSTN | Export only | Filing via GSP/CA |

## Env

```
# Supplier (PropOS) GSTIN for SaaS tax invoices
PROPOS_SUPPLIER_GSTIN=27AABCS1429B1Z5
PROPOS_SUPPLIER_STATE_CODE=27
PROPOS_DEFAULT_BUYER_STATE=27

# IRP adapter: mock (default) | gsp
GST_IRP_PROVIDER=mock
GST_AUTO_EINVOICE=true

# Licensed GSP (when GST_IRP_PROVIDER=gsp)
GST_GSP_API_KEY=
GST_GSP_BASE_URL=
GST_GSP_CLIENT_ID=
GST_GSP_CLIENT_SECRET=
```

## Tests

```bash
pnpm --filter @propos/backend exec jest --testPathPattern="tax-compute|gst-invoice|tds.service|mock-irp"
```
