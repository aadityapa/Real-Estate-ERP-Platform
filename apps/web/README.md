# PropOS Web

Next.js 15 frontend. Communicates with the backend only over HTTP and WebSocket — no shared runtime or database.

## Prerequisites

- Node.js 20+
- pnpm 9+
- PropOS API running (see `apps/api/README.md`)

## Setup

From the **repository root**:

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local` and set `NEXT_PUBLIC_API_URL` to your API URL.

## Run

```bash
# From repo root
pnpm dev:web

# Or from this directory
pnpm dev
```

App: http://localhost:3000

## Environment

All configuration lives in `apps/web/.env.local`. See `.env.example` in this folder.

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | REST base URL, e.g. `http://localhost:3001/api/v1` |
| `NEXT_PUBLIC_WS_URL` | Socket.IO origin, e.g. `http://localhost:3001` |
| `NEXT_PUBLIC_API_ORIGIN` | API host for `/storage` links (optional) |

## Docker

Build and run the web container (from repo root):

```bash
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1 \
  -t propos-web .
docker run -p 3000:3000 propos-web
```

## Standalone extraction

This app has no dependency on `packages/shared-types` or `packages/shared-utils`. You can copy `apps/web` into its own repository and point it at any PropOS-compatible API.
