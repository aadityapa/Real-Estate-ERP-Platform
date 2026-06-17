# PropOS — Real Estate ERP Platform

Enterprise-grade multi-tenant SaaS for Indian real estate developers.

## Quick Start

```bash
pnpm install
docker compose -f infrastructure/docker/docker-compose.yml up -d
pnpm db:generate
pnpm db:migrate
pnpm --filter @propos/api db:seed
pnpm dev
```

| Service | URL |
|---------|-----|
| Web | http://localhost:3000 |
| API | http://localhost:3001/api/v1 |
| Login | admin@demo.propos.in / Admin@123 |

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

### Phase 10 — Customer Portal ✅
- Customer list, portal pages
- React Native (Expo) mobile stub

## Architecture

```
apps/web     → Next.js 15 + Tailwind v4 + shadcn/ui
apps/api     → NestJS 11 + Prisma + PostgreSQL
apps/mobile  → Expo React Native
packages/    → shared-types, shared-utils, config
```

## API Modules

`auth` · `crm` · `sales` · `admin` · `hr` · `construction` · `finance` · `vendors` · `procurement` · `documents` · `legal` · `assets` · `marketing` · `channel-partners` · `ai` · `customers` · `notifications`
