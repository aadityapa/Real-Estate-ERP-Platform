# PropOS load testing (Phase 7.2)

## Stack under test

Target `infrastructure/docker/docker-compose.full.yml` (API `:3001`, web `:3000`, Postgres, Redis).

```bash
docker compose -f infrastructure/docker/docker-compose.full.yml up -d --build
# wait for healthy API
curl -sf http://localhost:3001/api/v1/health/live
```

Install [k6](https://k6.io/docs/get-started/installation/) locally (or run via container).

## SLOs

| Scenario | Script | Load | Latency | Errors |
|----------|--------|------|---------|--------|
| Login | `scripts/k6/login.js` | 20 VU / 30s | p95 &lt; 500ms | &lt; 1% |
| CRM leads list | `scripts/k6/crm-list.js` | 30 VU / 30s | p95 &lt; 400ms | &lt; 1% |
| Booking reserve | `scripts/k6/booking-create.js` | 5 VU / 20s | p95 &lt; 800ms | &lt; 5% |
| Realtime feed | `scripts/k6/realtime-feed.js` | 20 VU / 30s | p95 &lt; 500ms | engine.io open &gt; 99% |
| Tenant fairness | `scripts/k6/tenant-fairness.js` | see script | — | tenant B fail &lt; 10% |

## Commands

```bash
# Login
k6 run -e BASE_URL=http://localhost:3001/api/v1 \
  -e EMAIL=... -e PASSWORD=... scripts/k6/login.js

# CRM list
k6 run -e BASE_URL=http://localhost:3001/api/v1 \
  -e TOKEN=<jwt> scripts/k6/crm-list.js

# Booking (dedicated load-test lead/unit; expect 400 after first reserve)
k6 run -e BASE_URL=http://localhost:3001/api/v1 \
  -e TOKEN=<jwt> -e LEAD_ID=... -e UNIT_ID=... scripts/k6/booking-create.js

# Realtime feed + Engine.IO open
k6 run -e BASE_URL=http://localhost:3001/api/v1 \
  -e WS_BASE=http://localhost:3001 -e TOKEN=<jwt> scripts/k6/realtime-feed.js
```

## Caching & realtime (what load tests exercise)

- **Redis cache**: CRM dashboard, LMS KPI aggregates, inventory availability — versioned keys + stampede `SET NX` lock (`CacheService`). Writes bump namespace versions.
- **Socket.IO**: `RedisIoAdapter` in `main.ts` when `REDIS_URL` is set so multiple API replicas fan out `lead:claimed` / `lead:new`.
- **Claim race**: `LmsDataFeedService.claimLead` takes a Redis lock and uses `updateMany(... assignedToId: null)` so only one rep wins.

## Results log

| Date | Environment | Notes |
|------|-------------|-------|
| 2026-07-24 | local | Scripts + thresholds added. Full compose/k6 run deferred when Docker/API not available on the agent host — re-run commands above on a healthy stack and paste p95 / fail rates here. |

## Acceptance checklist

- [x] k6 scripts for login, CRM list, booking, realtime feed
- [x] SLOs documented as thresholds in each script
- [ ] Measured numbers on `docker-compose.full.yml` (operator: fill Results log)
