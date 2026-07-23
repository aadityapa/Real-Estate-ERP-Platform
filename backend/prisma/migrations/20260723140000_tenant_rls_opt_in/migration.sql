-- Phase 3.1 — PostgreSQL Row-Level Security (defense in depth), gated.
--
-- Apply with: pnpm --filter @propos/backend exec prisma migrate deploy
-- (migrate dev may fail if DATABASE_URL / Postgres is unreachable.)
--
-- Default behavior: policies are ENABLED but NO-OP unless BOTH are set on the
-- session:
--   SET app.propos_rls = 'on';
--   SET app.tenant_id = '<tenant cuid>';
--
-- Application toggle: POSTGRES_RLS_ENABLED=true should cause the app to run
-- those SETs at the start of each request (see docs/TENANT_ISOLATION.md).
-- Until then, Prisma tenant extension remains the primary enforcement layer.
--
-- Tradeoffs:
--   + DB-enforced isolation even if app code forgets a filter
--   + Works for raw SQL / reporting tools using the app role
--   - Requires SET LOCAL per transaction/request (pooler-friendly with LOCAL)
--   - Prisma migrate / seed / superuser bypasses RLS unless FORCE + non-owner role
--   - Relation-scoped tables need more complex policies (company/project joins)

CREATE OR REPLACE FUNCTION propos_rls_tenant_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '');
$$;

CREATE OR REPLACE FUNCTION propos_rls_active()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT current_setting('app.propos_rls', true) = 'on';
$$;

-- Helper: apply a standard tenantId policy to a table (idempotent).
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'AuditLog',
    'Company',
    'User',
    'Role',
    'Lead',
    'TabLoginConfig',
    'LmsGoal',
    'ClashLead',
    'Appointment',
    'HelpdeskTicket',
    'DaReport',
    'Customer',
    'Vendor',
    'LedgerEntry',
    'GSTInvoice',
    'Document',
    'Campaign',
    'ChannelPartner',
    'LegalCase',
    'Asset',
    'Subscription'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

    EXECUTE format('DROP POLICY IF EXISTS propos_tenant_isolation ON %I', tbl);
    EXECUTE format(
      'CREATE POLICY propos_tenant_isolation ON %I
         FOR ALL
         USING (
           NOT propos_rls_active()
           OR "tenantId" = propos_rls_tenant_id()
         )
         WITH CHECK (
           NOT propos_rls_active()
           OR "tenantId" = propos_rls_tenant_id()
         )',
      tbl
    );
  END LOOP;
END $$;
