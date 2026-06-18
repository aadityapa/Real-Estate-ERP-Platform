# PropOS API

NestJS REST + GraphQL + WebSocket backend. Runs independently from the web frontend.

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL and Redis (see `infrastructure/docker/docker-compose.yml`)

## Setup

From the **repository root**:

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
docker compose -f infrastructure/docker/docker-compose.yml up -d
pnpm db:generate
pnpm db:push
pnpm --filter @propos/api db:seed
```

## Run

```bash
# From repo root
pnpm dev:api

# Or from this directory
pnpm dev
```

| Endpoint | URL |
|----------|-----|
| REST API | http://localhost:3001/api/v1 |
| GraphQL | http://localhost:3001/graphql |
| WebSocket | ws://localhost:3001/events |

## Environment

All configuration lives in `apps/api/.env`. See `.env.example` in this folder.

| Variable | Description |
|----------|-------------|
| `PORT` | API listen port (default `3001`) |
| `CORS_ORIGINS` | Comma-separated frontend URLs allowed for CORS |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Access token signing secret |

## Docker

Build and run the API container (from repo root):

```bash
docker build -f apps/api/Dockerfile -t propos-api .
docker run --env-file apps/api/.env -p 3001:3001 propos-api
```

For a full stack (API + web + Postgres + Redis):

```bash
docker compose -f infrastructure/docker/docker-compose.full.yml up -d
```

## Demo login

After seeding: `admin@demo.propos.in` / `Admin@123`
