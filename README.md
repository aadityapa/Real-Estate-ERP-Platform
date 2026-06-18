# PropOS — Real Estate ERP Platform

Enterprise-grade multi-tenant SaaS for Indian real estate developers.

## Quick Start

Backend and frontend run as **separate apps** with their own environment files.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
docker compose -f infrastructure/docker/docker-compose.yml up -d
pnpm db:generate
pnpm db:push
pnpm --filter @propos/api db:seed
```

Run in two terminals (or use `pnpm dev` to start both):

```bash
pnpm dev:api   # http://localhost:3001/api/v1
pnpm dev:web   # http://localhost:3000
```

| Service | URL |
|---------|-----|
| Web | http://localhost:3000 |
| API | http://localhost:3001/api/v1 |
| Login | admin@demo.propos.in / Admin@123 |

See `apps/api/README.md` and `apps/web/README.md` for standalone setup and Docker deployment.

Full stack with Docker (Postgres + Redis + API + Web):

```bash
docker compose -f infrastructure/docker/docker-compose.full.yml up -d --build
```

## Implementation Status

### Phase 1 — Foundation ✅
Monorepo, NestJS, Next.js 15, Prisma (50+ models), Docker, JWT auth, RBAC guards, design system

### Phase 2 — CRM ✅
- Leads CRUD + filters + assign + archive
- Follow-ups & site visits
- Sales pipeline kanban (drag-and-drop)
- CRM dashboard with KPIs & charts

### Phase 3 — Sales & Inventory ✅
- Units inventory API + UI
- Bookings API + UI
- Sales dashboard

### Phase 4 — Admin & HRMS ✅
- Companies, projects, users
- Employees, attendance, leave

### Phase 5 — Construction ✅
- Milestones, DPR APIs + UI
- Construction dashboard

### Phase 6 — Finance & Vendor ✅
- Budget, ledger, vendors, purchase orders
- GST placeholder page

### Phase 7 — Documents, Legal, Assets ✅
- Document vault, legal cases, asset management

### Phase 8 — Marketing & Channels ✅
- Campaigns, channel partners

### Phase 9 — AI ✅
- Lead scoring & follow-up suggestion stubs (GPT-ready)

### Phase 11 — LMS Module ✅
- LMS Dashboard (KPIs, funnel, leaderboard, clash board)
- Goals & Targets with progress tracking
- Enhanced All Leads table (labels, call status, dismiss)
- Lead Tracking timeline view
- Appointments (Pending / Today / Upcoming)
- Site Visits + YPSR report form
- Data Feed (claim/release + WebSocket)
- 6 LMS Reports (call log, site visits, digital, DA, etc.)
- Tab Login IDs (role-based sidebar)
- Support helpdesk (tickets + replies)

## Architecture

```
apps/web     → Next.js 15 frontend (REST + WebSocket client only)
apps/api     → NestJS 11 backend (Prisma + PostgreSQL + Redis)
apps/mobile  → Expo React Native
packages/    → shared-types & shared-utils (API + mobile only)
```

The web app has **no dependency** on shared packages — it can be deployed or extracted independently.

## API Modules

`auth` · `crm` · `sales` · `admin` · `hr` · `construction` · `finance` · `vendors` · `procurement` · `documents` · `legal` · `assets` · `marketing` · `channel-partners` · `ai` · `customers` · `notifications`
