# Observability (Phase 4.1)

Production observability for PropOS: structured logs, distributed traces,
Prometheus metrics, and Sentry/GlitchTip error tracking. Everything is
**opt-in via env** — unset vars mean no-op (safe for local `pnpm dev`).

## Structured logging (pino)

Backend uses `nestjs-pino` with JSON output.

| Variable | Default | Purpose |
|----------|---------|---------|
| `LOG_LEVEL` | `info` | `fatal` / `error` / `warn` / `info` / `debug` / `trace` |

Every log line mixin includes `requestId` and `tenantId` when available.
Secrets and PII field paths are redacted (`[REDACTED]`). HTTP access logs
also go through the existing redacting middleware (skips `/health`, `/metrics`).

Sample log:

```json
{"level":30,"time":1721730000000,"pid":1,"hostname":"api","requestId":"a1b2c3d4-e5f6-7890-abcd-ef1234567890","tenantId":"clx…","context":"HTTP","method":"GET","path":"/api/v1/crm/leads","statusCode":200,"durationMs":42}
```

## OpenTelemetry tracing

| Variable | Default | Purpose |
|----------|---------|---------|
| `OTEL_ENABLED` | `false` | Set `true` to export spans |
| `OTEL_SERVICE_NAME` | `propos-api` | Resource `service.name` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318/v1/traces` | OTLP/HTTP traces URL |

Instrumentation: HTTP/Express (auto), ioredis (auto), Prisma
(`@prisma/instrumentation`), BullMQ job processing (manual spans).

Point at any OTLP collector:

```bash
# Jaeger all-in-one (OTLP HTTP on 4318)
OTEL_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces

# Grafana Tempo
OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318/v1/traces

# Datadog Agent OTLP intake
OTEL_EXPORTER_OTLP_ENDPOINT=http://datadog-agent:4318/v1/traces
```

## Prometheus metrics

| Variable | Default | Purpose |
|----------|---------|---------|
| `METRICS_ENABLED` | `false` | Expose `/metrics` |
| `METRICS_TOKEN` | _(required when enabled)_ | Bearer / `?token=` scrape secret |

Endpoint: `GET /metrics` (not under `/api/v1`). Returns 404 when disabled;
401 without a valid token.

Scraped series include:

- `propos_http_requests_total` / `propos_http_request_duration_seconds`
- `propos_queue_depth{queue="propos-tenant-jobs"}`
- `propos_db_pool_connections{state=…}` (from `pg_stat_activity`)
- Node defaults (`propos_nodejs_eventloop_lag_seconds`, heap, etc.)

```bash
curl -H "Authorization: Bearer $METRICS_TOKEN" http://localhost:3001/metrics
```

## Sentry / GlitchTip

### Backend

| Variable | Default | Purpose |
|----------|---------|---------|
| `SENTRY_DSN` | _(empty = off)_ | Project DSN (Sentry or GlitchTip) |
| `SENTRY_ENABLED` | `true` if DSN set | Force-disable with `false` |
| `SENTRY_ENVIRONMENT` | `NODE_ENV` | Environment tag |
| `SENTRY_RELEASE` | _(optional)_ | Release version |
| `SENTRY_TRACES_SAMPLE_RATE` | `0` | Performance sampling |

Tenant tag is set from the JWT via `TenantContextInterceptor`. PII scrubbed
in `beforeSend`.

### Frontend (Next.js)

| Variable | Default | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_SENTRY_DSN` | _(empty = off)_ | Browser DSN |
| `SENTRY_DSN` | _(optional)_ | Server/edge DSN (falls back to public) |
| `NEXT_PUBLIC_SENTRY_RELEASE` | _(optional)_ | Release tag |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | `0` | Browser traces |

Client sets `tenantId` tag and user `id` only (no email) from the auth store.
