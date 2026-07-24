# syntax=docker/dockerfile:1.7
# PropOS API — production multi-stage image (Phase 8.1)
# Prefer pinning NODE_IMAGE digest in registry builds:
#   --build-arg NODE_IMAGE=node:20-alpine@sha256:<digest>

ARG NODE_IMAGE=node:20-alpine

FROM ${NODE_IMAGE} AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY packages/config/package.json ./packages/config/
RUN pnpm install --frozen-lockfile --filter @propos/backend...

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY --from=deps /app/packages ./packages
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY backend ./backend
COPY packages/shared-types ./packages/shared-types
COPY packages/shared-utils ./packages/shared-utils
COPY packages/config ./packages/config
RUN pnpm --filter @propos/backend db:generate \
  && pnpm --filter @propos/backend build \
  && pnpm prune --prod

FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

RUN addgroup -g 1001 -S propos \
  && adduser -S -u 1001 -G propos propos \
  && mkdir -p /app/storage \
  && chown -R propos:propos /app

# Production deps only (pruned in build). No pnpm/corepack in final image.
COPY --from=build --chown=propos:propos /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=build --chown=propos:propos /app/backend/package.json ./backend/
COPY --from=build --chown=propos:propos /app/backend/dist ./backend/dist
COPY --from=build --chown=propos:propos /app/backend/prisma ./backend/prisma
COPY --from=build --chown=propos:propos /app/node_modules ./node_modules
COPY --from=build --chown=propos:propos /app/backend/node_modules ./backend/node_modules
COPY --from=build --chown=propos:propos /app/packages ./packages

USER propos
WORKDIR /app/backend
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/v1/health/live || exit 1

CMD ["node", "dist/main.js"]
