# syntax=docker/dockerfile:1.7
# PropOS web — production multi-stage (Next.js standalone, Phase 8.1)

ARG NODE_IMAGE=node:20-alpine

FROM ${NODE_IMAGE} AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/
COPY packages/config/package.json ./packages/config/
RUN pnpm install --frozen-lockfile --filter @propos/frontend...

FROM base AS build
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
ARG NEXT_PUBLIC_WS_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules
COPY --from=deps /app/packages ./packages
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend ./frontend
COPY packages/config ./packages/config
RUN pnpm --filter @propos/frontend build

FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -g 1001 -S propos \
  && adduser -S -u 1001 -G propos propos

COPY --from=build --chown=propos:propos /app/frontend/public ./frontend/public
COPY --from=build --chown=propos:propos /app/frontend/.next/standalone ./
COPY --from=build --chown=propos:propos /app/frontend/.next/static ./frontend/.next/static

USER propos
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ || exit 1

# standalone output places server.js under frontend/ (workspace package name path)
CMD ["node", "frontend/server.js"]
