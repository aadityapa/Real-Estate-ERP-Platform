-- Phase 4.3: allow AuditLog DELETE during tenant erasure only.
-- Normal UPDATE/DELETE still blocked. Session-local GUC:
--   SELECT set_config('app.propos_erasure', 'on', true);

CREATE OR REPLACE FUNCTION propos_audit_log_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('app.propos_erasure', true) = 'on' AND TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'AuditLog is append-only';
END;
$$;
