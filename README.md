# PropOS — Real Estate ERP Platform

Enterprise-grade multi-tenant SaaS for Indian real estate developers.

## Project structure

```
frontend/    → Next.js 15 web app (REST + WebSocket client)
backend/     → NestJS 11 API (Prisma + PostgreSQL + Redis)
apps/mobile  → Expo React Native
packages/    → shared-types & shared-utils (backend + mobile)
```

## Quick Start

```bash
pnpm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
docker compose -f infrastructure/docker/docker-compose.yml up -d
pnpm db:generate
pnpm db:push
pnpm --filter @propos/backend db:seed
```

Run in two terminals (or use `pnpm dev` to start both):

```bash
pnpm dev:backend   # http://localhost:3001/api/v1
pnpm dev:frontend  # http://localhost:3000
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:3001/api/v1 |
| Login | admin@demo.propos.in / Admin@123 |

See `backend/README.md` and `frontend/README.md` for standalone setup and Docker deployment.

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

## API Modules

`auth` · `crm` · `sales` · `admin` · `hr` · `construction` · `finance` · `vendors` · `procurement` · `documents` · `legal` · `assets` · `marketing` · `channel-partners` · `ai` · `customers` · `notifications`
