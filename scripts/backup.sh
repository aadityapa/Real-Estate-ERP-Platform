#!/usr/bin/env bash
# PropOS Postgres backup (Phase 4.3)
# Usage:
#   ./scripts/backup.sh
#   BACKUP_DIR=./backups DATABASE_URL=postgresql://... ./scripts/backup.sh
# Optional: upload dump to S3 when AWS_S3_BACKUP_PREFIX is set (requires aws CLI).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_FILE="$BACKUP_DIR/propos-$STAMP.dump"

mkdir -p "$BACKUP_DIR"

resolve_pg_dump() {
  if command -v pg_dump >/dev/null 2>&1; then
    echo "pg_dump"
    return
  fi
  if command -v docker >/dev/null 2>&1; then
    # Prefer compose service from infrastructure/docker
    if docker compose -f "$ROOT/infrastructure/docker/docker-compose.yml" ps postgres 2>/dev/null | grep -q Up; then
      echo "docker-compose"
      return
    fi
  fi
  echo "ERROR: pg_dump not found and postgres compose service is not running." >&2
  echo "Install PostgreSQL client tools or start infrastructure/docker/docker-compose.yml" >&2
  exit 1
}

MODE="$(resolve_pg_dump)"
echo "==> Backup mode: $MODE"
echo "==> Writing $OUT_FILE"

if [[ "$MODE" == "pg_dump" ]]; then
  if [[ -z "${DATABASE_URL:-}" ]]; then
    if [[ -f "$ROOT/backend/.env" ]]; then
      # shellcheck disable=SC1091
      set -a
      # Prefer DATABASE_URL only
      DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ROOT/backend/.env" | head -1 | cut -d= -f2-)"
      set +a
    fi
  fi
  if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "ERROR: DATABASE_URL is required" >&2
    exit 1
  fi
  pg_dump --format=custom --no-owner --no-acl --file="$OUT_FILE" "$DATABASE_URL"
else
  docker compose -f "$ROOT/infrastructure/docker/docker-compose.yml" exec -T postgres \
    pg_dump -U propos -d propos --format=custom --no-owner --no-acl >"$OUT_FILE"
fi

sha256sum "$OUT_FILE" >"$OUT_FILE.sha256" 2>/dev/null \
  || shasum -a 256 "$OUT_FILE" >"$OUT_FILE.sha256"

echo "==> Checksum: $(cat "$OUT_FILE.sha256")"

# Prune local dumps older than retention
find "$BACKUP_DIR" -name 'propos-*.dump' -type f -mtime +"$RETENTION_DAYS" -print -delete || true
find "$BACKUP_DIR" -name 'propos-*.dump.sha256' -type f -mtime +"$RETENTION_DAYS" -print -delete || true

if [[ -n "${AWS_S3_BACKUP_PREFIX:-}" ]] && command -v aws >/dev/null 2>&1; then
  KEY="${AWS_S3_BACKUP_PREFIX%/}/propos-$STAMP.dump"
  echo "==> Uploading to s3://$KEY"
  aws s3 cp "$OUT_FILE" "s3://$KEY"
  aws s3 cp "$OUT_FILE.sha256" "s3://$KEY.sha256"
fi

echo "==> Backup complete: $OUT_FILE"
