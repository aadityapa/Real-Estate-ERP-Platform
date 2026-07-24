# Container & image hardening (Phase 8.1)

## What changed

| Artifact | Notes |
|----------|--------|
| `backend/Dockerfile` | Multi-stage; `pnpm prune --prod`; non-root `propos` (uid 1001); healthcheck `/api/v1/health/live`; no corepack in final |
| `frontend/Dockerfile` | Next.js `output: "standalone"`; non-root; healthcheck; no pnpm in final |
| `.dockerignore` | Broader ignores (coverage, mobile, pptx, env) |
| `infrastructure/docker/docker-compose.prod.yml` | Postgres, Redis, API, web, Caddy TLS |
| `infrastructure/docker/Caddyfile` | Reverse proxy + HSTS |
| `infrastructure/docker/trivy-allowlist.txt` | Empty allowlist (fail on HIGH/CRITICAL) |
| CI job `container-scan` | Build both images, Trivy JSON, `scripts/trivy-gate.cjs` |

## Build & verify locally

```bash
docker build -f backend/Dockerfile -t propos-api:local .
docker build -f frontend/Dockerfile -t propos-web:local \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1 \
  --build-arg NEXT_PUBLIC_WS_URL=http://localhost:3001 .

docker run --rm propos-api:local id   # expect uid=1001(propos)
docker images propos-api:local propos-web:local

# Trivy (if installed)
trivy image --severity HIGH,CRITICAL -f json -o trivy-api.json propos-api:local
node scripts/trivy-gate.cjs trivy-api.json
```

## Prod compose

```bash
cp infrastructure/docker/.env.prod.example infrastructure/docker/.env.prod
# edit secrets
docker compose -f infrastructure/docker/docker-compose.prod.yml \
  --env-file infrastructure/docker/.env.prod up -d --build
```

## Pinning digests

Pass `--build-arg NODE_IMAGE=node:20-alpine@sha256:<digest>` (or set `NODE_IMAGE` in `.env.prod`) when promoting release images.

## Image sizes

Docker was not available on the agent host used for this phase — sizes are reported by the CI `container-scan` job (`docker images` step). Re-run locally when Docker Desktop is installed.

| Image | Size (approx) |
|-------|----------------|
| propos-api | see CI log |
| propos-web | see CI log |

**Skipped locally:** image build/run/Trivy (Docker CLI unavailable). CI job enforces Trivy gate.
