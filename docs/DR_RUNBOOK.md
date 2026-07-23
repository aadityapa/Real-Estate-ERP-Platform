# PropOS Disaster Recovery Runbook (Phase 4.3)

**RPO:** 15 minutes (WAL / continuous archive)  
**RTO:** 4 hours (restore dump → migrate check → app boot → DNS/cutover)

Operational constants live in `backend/src/common/lifecycle/retention.ts` and
`infrastructure/backup/`.

---

## 1. Backup strategy

| Layer | Strategy | Retention (default) |
|-------|----------|---------------------|
| **Postgres base** | Nightly `pg_dump --format=custom` via `scripts/backup.sh` | 30 days (`BACKUP_RETENTION_DAYS`) |
| **Postgres PITR** | Managed Postgres continuous WAL (RDS/Cloud SQL/Neon) or `archive_command` to S3 | 7 days (`BACKUP_PITR_DAYS`) |
| **S3 documents** | Bucket **versioning ON** + lifecycle (`infrastructure/backup/s3-lifecycle.json`) | Noncurrent versions 90 days; abort multipart 7 days; dump prefix expire 30 days |
| **Redis** | **AOF preferred** for BullMQ durability; treat RDB-only as cache-grade. Queues are rebuildable; do not rely on Redis as system of record. |
| **AuditLog** | Append-only; retained ~7 years operationally; **removed on tenant hard-delete** under `app.propos_erasure=on` | `AUDIT_LOG_RETENTION_DAYS` |

### Nightly job (example)

```bash
# Linux/macOS or Git Bash
export DATABASE_URL=postgresql://propos:***@db:5432/propos
export BACKUP_RETENTION_DAYS=30
# optional offsite:
# export AWS_S3_BACKUP_PREFIX=propos-prod-backups/postgres
./scripts/backup.sh
```

Apply S3 lifecycle once per documents/backups bucket:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket propos-documents \
  --lifecycle-configuration file://infrastructure/backup/s3-lifecycle.json
```

Enable versioning:

```bash
aws s3api put-bucket-versioning --bucket propos-documents \
  --versioning-configuration Status=Enabled
```

---

## 2. Restore to scratch DB

Never restore onto the live database name (`propos`) unless
`ALLOW_LIVE_RESTORE=1`.

```bash
./scripts/backup.sh
./scripts/restore.sh backups/propos-YYYYMMDDTHHMMSSZ.dump
# Scratch URL → backups/.last-restore-url
```

### Prove the backup (acceptance)

```bash
./scripts/verify-restore.sh backups/propos-YYYYMMDDTHHMMSSZ.dump
```

This:

1. Creates/replaces `propos_restore_verify` (or `SCRATCH_DB`)
2. Runs `SELECT` + lists recent `_prisma_migrations`
3. Connects Prisma client and prints `tenant_count`

Optional app boot against scratch:

```bash
export DATABASE_URL="$(cat backups/.last-restore-url)"
pnpm --filter @propos/backend start
curl -s http://localhost:3001/api/v1/health/live
curl -s http://localhost:3001/api/v1/health/ready
```

Health endpoints (Phase 4.2) must keep working after restore — do not change
their contracts when editing DR scripts.

### Windows notes

- Prefer **Git Bash** for `scripts/*.sh` (`"C:\Program Files\Git\bin\bash.exe" scripts/backup.sh`).
- If `pg_dump` is missing, start `infrastructure/docker/docker-compose.yml` and
  re-run; scripts fall back to `docker compose exec postgres …`.
- If Postgres is down, `prisma migrate deploy` will fail — apply when the DB is up
  (migration `20260723180000_audit_log_erasure_allow` for erasure GUC).

---

## 3. Failover / DR drill checklist

1. [ ] Take a fresh dump (`scripts/backup.sh`) and note checksum `.sha256`
2. [ ] Restore to scratch (`scripts/verify-restore.sh`)
3. [ ] Confirm migration status matches production
4. [ ] Boot API with scratch `DATABASE_URL`; hit `/health/live` + `/health/ready`
5. [ ] Spot-check one tenant login (staging only)
6. [ ] Document elapsed time vs RTO; dump age vs RPO
7. [ ] Drop scratch DB when finished

### Production cutover (outline)

1. Stop writers / scale API to 0 (or maintenance mode)
2. Final dump or promote PITR replica to target time
3. Point `DATABASE_URL` at restored instance; `prisma migrate deploy`
4. Scale API up; verify ready probe
5. Invalidate CDN if document keys moved
6. Post-mortem within 48h

---

## 4. Tenant data lifecycle (DPDP / GDPR)

| Right | Endpoint | Permission |
|-------|----------|------------|
| Portability | `GET /api/v1/admin/lifecycle/export` | `admin:export:tenant` |
| Erasure | `DELETE /api/v1/admin/lifecycle` body `{ "confirmSlug": "<slug>" }` | `admin:delete:tenant` |

### Export

Returns JSON (`schemaVersion: 1`) with tenant metadata, users (no password
hashes), customers (PII decrypted via Prisma extension), companies, documents
metadata, leads, vendors, and counts. Does **not** include session tokens.

### Hard delete

1. Verifies `confirmSlug === tenant.slug`
2. Collects document / version `fileUrl`s → storage keys
3. Transaction: `set_config('app.propos_erasure','on',true)` then ordered SQL
   deletes (`TENANT_DELETE_STEPS`), including `AuditLog` rows for that tenant
4. Purges local `storage/` files; best-effort S3 via AWS CLI when credentials set
   (deferred keys returned if AWS unavailable)

**Irreversible.** Export first. Global `Permission` rows are never deleted.

Migration required for erasure: `20260723180000_audit_log_erasure_allow`

```bash
pnpm --filter @propos/backend exec prisma migrate deploy
```

---

## 5. Related

- Health probes: Phase 4.2 (`/health/live`, `/health/ready`)
- Observability: `docs/OBSERVABILITY.md`
- Tenant isolation: `docs/TENANT_ISOLATION.md`
- Individual data-subject rights (beyond tenant-level): Phase 6.3 DPDP
