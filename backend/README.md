# PropOS Backend

NestJS REST + GraphQL + WebSocket API. Runs independently from the frontend in `frontend/`.

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL and Redis (see `infrastructure/docker/docker-compose.yml`)

## Setup

From the **repository root**:

```bash
pnpm install
cp backend/.env.example backend/.env
docker compose -f infrastructure/docker/docker-compose.yml up -d
pnpm db:generate
pnpm db:push
pnpm --filter @propos/backend db:seed
```

## Run

```bash
# From repo root
pnpm dev:backend

# Or from this directory
pnpm dev
```

| Endpoint | URL |
|----------|-----|
| REST API | http://localhost:3001/api/v1 |
| GraphQL | http://localhost:3001/graphql |
| WebSocket | ws://localhost:3001/events |

## Environment

All configuration lives in `backend/.env`. See `.env.example` in this folder.

| Variable | Description |
|----------|-------------|
| `PORT` | API listen port (default `3001`) |
| `HOST` | Bind address (default `0.0.0.0` for LAN access) |
| `CORS_ORIGINS` | Comma-separated frontend URLs allowed for CORS |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Access token signing secret |

## Docker

Build and run the backend container (from repo root):

```bash
docker build -f backend/Dockerfile -t propos-backend .
docker run --env-file backend/.env -p 3001:3001 propos-backend
```

## Demo login

After seeding: `admin@demo.propos.in` / `Admin@123`
