# PropOS Security Baseline

**Date:** 2026-07-23  
**Playbook:** Phase 0.2  
**Rule:** No upgrades applied in this pass — report only.

---

## 1. `pnpm audit` summary

Ran at monorepo root (`pnpm audit`).

| Severity | Count (approx.) |
|----------|-----------------|
| Critical | 2 |
| High | 22 |
| Moderate | 17 |
| Low | 1 |
| **Total** | **42** |

### Critical / high highlights

| Package | Severity | Issue (summary) | Path | Remediation |
|---------|----------|-----------------|------|-------------|
| `tar` | critical/high | Path traversal / DoS / hardlink escapes | transitive (often via node-gyp/npm tooling) | Upgrade parent; often fixed by newer Node toolchain / dependency bumps |
| `next` @15.5.19 | high/moderate | DoS App Router, SSRF Server Actions, image DoS, internal endpoint disclosure | `frontend` | **Upgrade to ≥15.5.21** (quick win) |
| `multer` | high/moderate | DoS via nested fields / incomplete uploads | Nest/Express upload stack | Bump `@nestjs/platform-express` / multer |
| `ws` | high | Memory exhaustion DoS | Socket.IO stack | Bump `socket.io` / `ws` |
| `sharp` | high | libvips CVEs | Next image pipeline | Bump `sharp` / Next |
| `js-yaml` / `brace-expansion` / `shell-quote` / `fast-uri` | high | DoS / host confusion | transitive | pnpm overrides or parent bumps |
| `@apollo/server` | moderate | Browser CSRF-class bypass | backend GraphQL | Upgrade Apollo Server major (peer note: Nest expects ^5) |

---

## 2. Dependencies >1 major behind / risk notes

| Package | Current (approx.) | Notes |
|---------|-------------------|-------|
| `@apollo/server` | 4.x | Nest Apollo peer wants ^5 — unmet peer already warned |
| `recharts` | 2.x | Deprecated branch; v3 migration available |
| `bcrypt` | 5.x | Consider `bcryptjs` or ensure native build in Docker |
| Expo / RN mobile | older peer mismatches | Separate mobile track (Phase 10) |

Unmaintained: none hard-flagged beyond recharts 2.x deprecation notice.

---

## 3. Risky code patterns

| Pattern | Result |
|---------|--------|
| `eval(` | Not found in backend/frontend src |
| `child_process` | Not found in app src |
| Dynamic `require` | Not systematically used in domain modules |
| `rejectUnauthorized: false` | Not found |
| `$queryRaw` / `$executeRaw` | Not found in backend src |
| `dangerouslySetInnerHTML` | `frontend/app/layout.tsx` — inline theme boot script (static) — **acceptable**, keep non-user-controlled |

---

## 4. Remediation plan

### Quick wins (hours)

1. Bump `next` to `>=15.5.21` in `frontend/package.json`; reinstall; smoke login + dashboard.
2. Re-run `pnpm audit`; record remaining highs.
3. Add CI job `pnpm audit --audit-level=high` (warn → fail later) — Phase 1.4.
4. Document that production must not use placeholder JWT secrets (boot check — Phase 2.1).
5. **Phase 2.4 (done):** Append-only `AuditLog`; AES-256-GCM PII-at-rest (`PII_ENCRYPTION_KEY`); production refuses placeholder JWT / storage / PII keys. See migration `20260723090000_audit_log_pii_protection`.

### Needs testing (days)

1. Upgrade `@apollo/server` to v5 + align `@nestjs/apollo` peers; regression-test GraphQL.
2. Bump Socket.IO / `ws` across api + web; retest LMS data-feed sockets.
3. Multer / Nest platform-express bump; retest any file upload paths.
4. Consider `pnpm.overrides` for `tar` / `brace-expansion` if still transitive after parent bumps.
5. Trivy image scan in CI once Dockerfiles hardened — Phase 8.1.

### Explicit non-goals this pass

- No mass `pnpm update` without regression suite (suite is Phase 1).
- No force-resolving criticals that break native builds without Docker verification.

---

## 5. Acceptance for this document

- [x] Root `pnpm audit` executed and summarized  
- [x] Risky patterns grepped  
- [x] Remediation grouped by effort  

**Next:** Phase 3.1 tenant scoping structurally (Prisma extension + optional RLS).

---

## 6. Phase 2.4 — Secrets, audit log & data protection (implemented)

| Area | Already present before 2.4 | Added in 2.4 |
|------|----------------------------|--------------|
| JWT placeholder boot check | Phase 2.1 (`assertJwtSecretsConfigured`) | Expanded to `STORAGE_URL_SECRET` + `PII_ENCRYPTION_KEY` via `assertProductionSecretsConfigured` |
| Request PII redaction in logs | Phase 2.3 (`redact.ts`) | Unchanged |
| Audit trail | None | Append-only `AuditLog` + interceptor on sensitive mutations |
| PII-at-rest | Plaintext `Customer.pan` / `aadhaar`, Json `bankDetails` | AES-256-GCM (`enc:v1:…`); Aadhaar stored as last-4 only; Prisma extension decrypts for API |

**Migrate when Postgres is up:**

```bash
pnpm --filter @propos/backend exec prisma migrate deploy
```
