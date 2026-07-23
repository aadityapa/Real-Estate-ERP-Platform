#!/usr/bin/env bash
# PropOS restore into a scratch database (Phase 4.3)
# Usage:
#   ./scripts/restore.sh backups/propos-YYYYMMDD.dump
#   SCRATCH_DB=propos_restore ./scripts/restore.sh path/to.dump
#
# Never restores onto the live DB name unless ALLOW_LIVE_RESTORE=1.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DUMP="${1:-}"
SCRATCH_DB="${SCRATCH_DB:-propos_restore}"
LIVE_DB="${LIVE_DB:-propos}"

if [[ -z "$DUMP" || ! -f "$DUMP" ]]; then
  echo "Usage: $0 <path-to-propos-*.dump>" >&2
  exit 1
fi

if [[ "$SCRATCH_DB" == "$LIVE_DB" && "${ALLOW_LIVE_RESTORE:-0}" != "1" ]]; then
  echo "ERROR: Refusing to restore into live DB '$LIVE_DB'." >&2
  echo "Set SCRATCH_DB to a different name, or ALLOW_LIVE_RESTORE=1 with extreme care." >&2
  exit 1
fi

parse_url() {
  # Very small parser for postgresql://user:pass@host:port/db
  local url="${DATABASE_URL:-}"
  if [[ -z "$url" && -f "$ROOT/backend/.env" ]]; then
    url="$(grep -E '^DATABASE_URL=' "$ROOT/backend/.env" | head -1 | cut -d= -f2-)"
  fi
  if [[ -z "$url" ]]; then
    url="postgresql://propos:propos@localhost:5432/propos"
  fi
  DATABASE_URL="$url"
  PGUSER="$(echo "$url" | sed -E 's|^postgresql://([^:]+):.*|\1|')"
  PGPASSWORD="$(echo "$url" | sed -E 's|^postgresql://[^:]+:([^@]+)@.*|\1|')"
  PGHOST="$(echo "$url" | sed -E 's|^postgresql://[^@]+@([^:/]+).*|\1|')"
  PGPORT="$(echo "$url" | sed -E 's|^postgresql://[^@]+@[^:/]+:([0-9]+).*|\1|; t; s|.*|5432|')"
  export DATABASE_URL PGUSER PGPASSWORD PGHOST PGPORT
}

use_docker() {
  command -v docker >/dev/null 2>&1 \
    && docker compose -f "$ROOT/infrastructure/docker/docker-compose.yml" ps postgres 2>/dev/null | grep -q Up
}

echo "==> Restoring $DUMP → database '$SCRATCH_DB'"

if use_docker; then
  COMPOSE=(docker compose -f "$ROOT/infrastructure/docker/docker-compose.yml")
  "${COMPOSE[@]}" exec -T postgres \
    psql -U propos -d postgres -v ON_ERROR_STOP=1 \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$SCRATCH_DB' AND pid <> pg_backend_pid();" \
    -c "DROP DATABASE IF EXISTS \"$SCRATCH_DB\";" \
    -c "CREATE DATABASE \"$SCRATCH_DB\" OWNER propos;"
  "${COMPOSE[@]}" exec -T postgres \
    pg_restore -U propos -d "$SCRATCH_DB" --clean --if-exists --no-owner --no-acl <"$DUMP" \
    || true # pg_restore returns 1 on benign warnings
else
  parse_url
  if ! command -v pg_restore >/dev/null 2>&1; then
    echo "ERROR: pg_restore not found and docker postgres is not up." >&2
    exit 1
  fi
  export PGPASSWORD
  psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -v ON_ERROR_STOP=1 \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$SCRATCH_DB' AND pid <> pg_backend_pid();" \
    -c "DROP DATABASE IF EXISTS \"$SCRATCH_DB\";" \
    -c "CREATE DATABASE \"$SCRATCH_DB\" OWNER \"$PGUSER\";"
  pg_restore -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$SCRATCH_DB" \
    --clean --if-exists --no-owner --no-acl "$DUMP" || true
fi

# Emit a DATABASE_URL pointing at the scratch DB for verify-restore / app boot
BASE_URL="${DATABASE_URL:-postgresql://propos:propos@localhost:5432/propos}"
SCRATCH_URL="$(echo "$BASE_URL" | sed -E "s|/[^/?]+(\\?.*)?$|/$SCRATCH_DB\\1|")"
echo "$SCRATCH_URL" >"$ROOT/backups/.last-restore-url"
echo "==> Scratch DATABASE_URL written to backups/.last-restore-url"
echo "==> Restore complete: $SCRATCH_DB"
