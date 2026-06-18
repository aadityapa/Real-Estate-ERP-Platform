# PropOS Frontend

Next.js 15 web app. Communicates with the backend only over HTTP and WebSocket.

## Prerequisites

- Node.js 20+
- pnpm 9+
- PropOS backend running (see `backend/README.md`)

## Setup

From the **repository root**:

```bash
pnpm install
cp frontend/.env.example frontend/.env.local
```

Edit `frontend/.env.local` and set `NEXT_PUBLIC_API_URL` to your backend URL.

## Run

```bash
# From repo root
pnpm dev:frontend

# Or from this directory
pnpm dev
```

App: http://localhost:3000

## Environment

All configuration lives in `frontend/.env.local`. See `.env.example` in this folder.

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | REST base URL, e.g. `http://localhost:3001/api/v1` |
| `NEXT_PUBLIC_WS_URL` | Socket.IO origin, e.g. `http://localhost:3001` |
| `NEXT_PUBLIC_API_ORIGIN` | Backend host for `/storage` links (optional) |

## Docker

Build and run the frontend container (from repo root):

```bash
docker build -f frontend/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1 \
  -t propos-frontend .
docker run -p 3000:3000 propos-frontend
```

## Standalone extraction

This folder has no dependency on `packages/shared-types` or `packages/shared-utils`. You can copy `frontend/` into its own repository and point it at any PropOS-compatible API.
