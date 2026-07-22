# Contributing to PropOS

Thanks for your interest in contributing. This document covers everything
you need to set up the project locally and submit a change.

## Prerequisites

- **Node.js** `>= 20` (see `engines.node` in the root `package.json`)
- **pnpm** `9.15.0` (declared as `packageManager` in the root `package.json`
  — via [Corepack](https://pnpm.io/installation#using-corepack):
  `corepack enable && corepack prepare pnpm@9.15.0 --activate`)
- **Docker** (for local PostgreSQL + Redis via
  `infrastructure/docker/docker-compose.yml`)
- **PostgreSQL** and **Redis** (either via the provided Docker Compose files
  or your own local instances)

## Setup

1. **Install dependencies** (from the repo root — this is a pnpm workspace,
   so a single install wires up `backend`, `frontend`, `apps/*`, and
   `packages/*`):

   ```bash
   pnpm install
   ```

2. **Configure environment variables:**

   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env.local
   ```

   Fill in `backend/.env` at minimum with `DATABASE_URL`, `REDIS_URL`,
   `JWT_SECRET`, and `JWT_REFRESH_SECRET`. See `.env.example` at the repo
   root for an overview of where each env file lives.

3. **Start local infrastructure** (PostgreSQL + Redis):

   ```bash
   docker compose -f infrastructure/docker/docker-compose.yml up -d
   ```

4. **Set up the database:**

   ```bash
   pnpm db:generate   # generate the Prisma client
   pnpm db:push       # sync schema.prisma to the database
   pnpm --filter @propos/backend db:seed   # optional: seed demo data
   ```

5. **Run the app in development:**

   ```bash
   pnpm dev            # backend + frontend together (via Turborepo)
   # or, in separate terminals:
   pnpm dev:backend    # http://localhost:3001/api/v1
   pnpm dev:frontend   # http://localhost:3000
   ```

   For the mobile app: `pnpm --filter @propos/mobile dev` (Expo).

## Everyday commands

| Command | What it does |
|---|---|
| `pnpm build` | Build backend + frontend (Turborepo, dependency-aware) |
| `pnpm lint` | Lint all workspace packages (`turbo lint`) |
| `pnpm test` | Run tests across all workspace packages (`turbo test`) |
| `pnpm format` | Format the repo with Prettier |
| `pnpm db:studio` | Open Prisma Studio against the backend database |
| `pnpm --filter @propos/backend <script>` | Run a backend-only script (e.g. `test`, `db:migrate`) |
| `pnpm --filter @propos/frontend <script>` | Run a frontend-only script (e.g. `lint`) |

Run lint and tests for the package(s) you touched before opening a PR:

```bash
pnpm lint
pnpm test
pnpm build
```

## Branch naming

Use a short, descriptive branch name prefixed by type:

```
feature/<short-description>     e.g. feature/crm-lead-scoring
fix/<short-description>         e.g. fix/booking-double-submit
chore/<short-description>       e.g. chore/upgrade-prisma
docs/<short-description>        e.g. docs/architecture-overview
refactor/<short-description>
```

## Commit messages

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <short summary>

[optional body]

[optional footer(s)]
```

Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
`build`, `ci`, `chore`. Example:

```
feat(crm): add site-visit follow-up reminders
fix(sales): correct unit availability check on booking
docs(readme): update quick start instructions
```

## Pull request process

1. Fork or branch from `main`.
2. Make your change, keeping it scoped to a single concern.
3. Ensure `pnpm lint`, `pnpm build`, and `pnpm test` pass locally for the
   affected package(s).
4. Update relevant documentation (`README.md`, `ARCHITECTURE.md`, module
   READMEs) if behavior, setup, or structure changed.
5. Open a PR against `main` using the PR template. Describe what changed and
   why, link related issues, and note any manual testing performed.
6. Address review feedback via additional commits (avoid force-pushing over
   review history until the PR is approved).
7. A maintainer will merge once CI is green and the PR is approved.

## Code style

- TypeScript is used throughout; keep new code strictly typed.
- Follow the existing ESLint configuration (`@propos/config` package;
  backend runs `eslint` directly, frontend runs `next lint`).
- Run `pnpm format` before committing if you're unsure about formatting —
  Prettier config applies to `.ts`, `.tsx`, `.md`, and `.json` files.

## Reporting issues

Use the issue templates under `.github/ISSUE_TEMPLATE/` for bug reports and
feature requests. For security vulnerabilities, do **not** open a public
issue — see [SECURITY.md](./SECURITY.md).
