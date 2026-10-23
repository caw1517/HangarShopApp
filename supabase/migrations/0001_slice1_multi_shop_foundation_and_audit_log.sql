-- Slice 1: Multi-Shop Foundation, Append-Only Audit Log & Untitled UI 3-Column App Shell
-- Issue #28
--
-- Implements:
--   - organizations (Shop) and org_memberships (Member) tables
--   - Last-Admin Guard + hard-delete block on org_memberships (ADR-0002)
--   - append-only audit_log with capture trigger + immutability guard (ADR-0002)
--   - multi-tenant Row-Level Security via org_memberships (ADR-0001)
--   - blind shop provisioning RPC for the Platform Owner flow
--   - storage.objects RLS for the shop-documents bucket (ADR-0001)

-- =========================================================================
-- Extensions
-- =========================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================================
-- Tables
-- =========================================================================

-- organizations: a Shop (CONTEXT.md). Tenant root for all domain data.
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tool_id_prefix text NOT NULL DEFAULT 'TL',
  timezone text NOT NULL DEFAULT 'America/Los_Angeles',
  due_soon_days integer NOT NULL DEFAULT 90 CHECK (due_soon_days BETWEEN 1 AND 365),
  weekly_digest_day integer NOT NULL DEFAULT 1 CHECK (weekly_digest_day BETWEEN 0 AND 6),
  weekly_digest_hour integer NOT NULL DEFAULT 6 CHECK (weekly_digest_hour BETWEEN 0 AND 23),
  weekly_digest_minute integer NOT NULL DEFAULT 0 CHECK (weekly_digest_minute BETWEEN 0 AND 59),
  missing_tool_threshold_days integer NOT NULL DEFAULT 30 CHECK (missing_tool_threshold_days >= 1),
  stale_aircraft_days integer NOT NULL DEFAULT 30 CHECK (stale_aircraft_days >= 1),
  idle_timeout_minutes integer NOT NULL DEFAULT 30 CHECK (idle_timeout_minutes BETWEEN 5 AND 480),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- org_memberships: a Member (CONTEXT.md). user_id is intentionally a plain
-- uuid (no FK to auth.users) -- project convention for this layer. It is
-- null while status = 'invited', before the invitee's first sign-in.
CREATE TABLE org_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  user_id uuid,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'inspector', 'mechanic')),
  is_cal_designee boolean NOT NULL DEFAULT false,
  is_designated_auditor boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'deactivated')),
  certificate_type text NOT NULL DEFAULT 'N/A',
  certificate_number text NOT NULL DEFAULT 'N/A',
  invited_by uuid,
  deactivated_at timestamptz,
  deactivation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- audit_log: append-only change ledger (ADR-0002).
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  actor_user_id uuid,
  actor_email text,
  actor_name text,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  reason text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================================================
-- Indexes
-- =========================================================================

CREATE INDEX idx_org_memberships_org_status ON org_memberships (org_id, status);
CREATE INDEX idx_org_memberships_org_role ON org_memberships (org_id, role);
CREATE UNIQUE INDEX uq_org_memberships_org_email ON org_memberships (org_id, email);
CREATE UNIQUE INDEX uq_org_memberships_org_user ON org_memberships (org_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX idx_audit_log_org_created_at ON audit_log (org_id, created_at DESC);
CREATE INDEX idx_audit_log_org_table_record ON audit_log (org_id, table_name, record_id);
CREATE INDEX idx_audit_log_org_action ON audit_log (org_id, action);

-- =========================================================================
-- Trigger functions
-- =========================================================================

-- Last-Admin Guard: block any UPDATE/DELETE on org_memberships that would
-- leave a Shop with zero active admins.
CREATE OR REPLACE FUNCTION enforce_last_admin_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  remaining_active_admins integer;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'active' AND OLD.role = 'admin' THEN
      IF NOT (NEW.status = 'active' AND NEW.role = 'admin') THEN
        SELECT count(*) INTO remaining_active_admins
        FROM org_memberships
        WHERE org_id = OLD.org_id
          AND status = 'active'
          AND role = 'admin'
          AND id <> OLD.id;

        IF remaining_active_admins = 0 THEN
          RAISE EXCEPTION 'LAST_ADMIN_GUARD: cannot change role/status of the last active admin for this Shop';
        END IF;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'active' AND OLD.role = 'admin' THEN
      SELECT count(*) INTO remaining_active_admins
      FROM org_memberships
      WHERE org_id = OLD.org_id
        AND status = 'active'
        AND role = 'admin'
        AND id <> OLD.id;

      IF remaining_active_admins = 0 THEN
        RAISE EXCEPTION 'LAST_ADMIN_GUARD: cannot remove the last active admin for this Shop';
      END IF;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Hard-delete block: org_memberships rows are deactivated, never deleted
-- (ADR-0002). This makes the DELETE branch of enforce_last_admin_guard
-- unreachable in practice; both triggers are kept for defense in depth and
-- because the DELETE case is part of the spec.
CREATE OR REPLACE FUNCTION prevent_org_membership_hard_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'HARD_DELETE_BLOCKED: org_memberships rows are deactivated, never deleted (ADR-0002)';
END;
$$;

-- Append-only audit capture (ADR-0002). SECURITY DEFINER so it can write to
-- audit_log regardless of the acting role's direct grants (UPDATE/DELETE on
-- audit_log are revoked from every role below).
CREATE OR REPLACE FUNCTION record_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_log (
    org_id,
    actor_user_id,
    actor_email,
    actor_name,
    table_name,
    record_id,
    action,
    reason,
    before_data,
    after_data
  ) VALUES (
    COALESCE(NEW.org_id, OLD.org_id, NEW.id, OLD.id),
    auth.uid(),
    current_setting('app.current_actor_email', true),
    current_setting('app.current_actor_name', true),
    TG_TABLE_NAME,
    NEW.id,
    TG_OP,
    current_setting('app.current_reason', true),
    to_jsonb(OLD),
    to_jsonb(NEW)
  );
  RETURN NEW;
END;
$$;

-- Defensive immutability for audit_log rows (ADR-0002).
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'AUDIT_LOG_IMMUTABLE: audit_log rows cannot be updated or deleted (ADR-0002)';
END;
$$;

-- =========================================================================
-- Triggers
-- =========================================================================

CREATE TRIGGER trg_org_memberships_last_admin_guard
  BEFORE UPDATE OR DELETE ON org_memberships
  FOR EACH ROW
  EXECUTE FUNCTION enforce_last_admin_guard();

CREATE TRIGGER trg_org_memberships_block_hard_delete
  BEFORE DELETE ON org_memberships
  FOR EACH ROW
  EXECUTE FUNCTION prevent_org_membership_hard_delete();

CREATE TRIGGER trg_organizations_audit_log
  AFTER INSERT OR UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION record_audit_log();

CREATE TRIGGER trg_org_memberships_audit_log
  AFTER INSERT OR UPDATE ON org_memberships
  FOR EACH ROW
  EXECUTE FUNCTION record_audit_log();

CREATE TRIGGER trg_audit_log_prevent_mutation
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_mutation();

-- =========================================================================
-- Row-Level Security (ADR-0001)
-- =========================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;

ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_memberships FORCE ROW LEVEL SECURITY;

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;

-- =========================================================================
-- Helper functions (SECURITY DEFINER to read org_memberships under RLS)
-- =========================================================================

CREATE OR REPLACE FUNCTION is_active_org_member(target_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM org_memberships m
    WHERE m.org_id = target_org_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION has_org_role(target_org_id uuid, allowed_roles text[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT is_active_org_member(target_org_id)
    AND EXISTS (
      SELECT 1
      FROM org_memberships m
      WHERE m.org_id = target_org_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role = ANY (allowed_roles)
    );
$$;

-- Platform Owner blind provisioning RPC. Platform owner calls are just any
-- authenticated Supabase user in this model, gated at the application
-- layer (not by a platform-owner DB role) -- see ADR-0001. This function
-- deliberately never inserts an org_memberships row for the caller, so the
-- caller gains zero tenant read access to the new Shop's data afterward.
CREATE OR REPLACE FUNCTION provision_shop_blind(
  shop_name text,
  shop_slug text,
  tool_id_prefix text,
  timezone text,
  admin_email text,
  admin_full_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
BEGIN
  INSERT INTO organizations (name, slug, tool_id_prefix, timezone)
  VALUES (shop_name, shop_slug, tool_id_prefix, timezone)
  RETURNING id INTO new_org_id;

  INSERT INTO org_memberships (org_id, user_id, email, full_name, role, status)
  VALUES (new_org_id, NULL, admin_email, admin_full_name, 'admin', 'invited');

  RETURN jsonb_build_object(
    'org_id', new_org_id,
    'admin_email', admin_email,
    'invite_status', 'invited'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION provision_shop_blind(text, text, text, text, text, text) TO authenticated;

-- =========================================================================
-- RLS policies
-- =========================================================================

-- organizations: no INSERT/DELETE policies for normal authenticated roles;
-- provisioning only happens via provision_shop_blind (SECURITY DEFINER,
-- bypasses RLS).
CREATE POLICY organizations_select ON organizations
  FOR SELECT
  USING (is_active_org_member(id));

CREATE POLICY organizations_update ON organizations
  FOR UPDATE
  USING (has_org_role(id, ARRAY['admin']))
  WITH CHECK (has_org_role(id, ARRAY['admin']));

-- org_memberships: no DELETE policy (hard delete already blocked by trigger).
CREATE POLICY org_memberships_select ON org_memberships
  FOR SELECT
  USING (is_active_org_member(org_id));

CREATE POLICY org_memberships_insert ON org_memberships
  FOR INSERT
  WITH CHECK (has_org_role(org_id, ARRAY['admin']));

CREATE POLICY org_memberships_update ON org_memberships
  FOR UPDATE
  USING (has_org_role(org_id, ARRAY['admin']))
  WITH CHECK (has_org_role(org_id, ARRAY['admin']));

-- audit_log: read restricted to admin + inspector (issue #28), not all
-- active members. No INSERT/UPDATE/DELETE policies for normal roles --
-- inserts happen only via record_audit_log (SECURITY DEFINER trigger);
-- mutation is blocked by prevent_audit_log_mutation and the REVOKE below.
CREATE POLICY audit_log_select ON audit_log
  FOR SELECT
  USING (has_org_role(org_id, ARRAY['admin', 'inspector']));

-- =========================================================================
-- Storage policies: shop-documents bucket (ADR-0001)
-- Note: the shop-documents bucket itself must be created separately (e.g.
-- via the Supabase dashboard/API), not in this SQL migration.
-- =========================================================================

CREATE POLICY shop_documents_select ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'shop-documents'
    AND is_active_org_member(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY shop_documents_insert ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'shop-documents'
    AND is_active_org_member(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY shop_documents_update ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'shop-documents'
    AND is_active_org_member(((storage.foldername(name))[1])::uuid)
  )
  WITH CHECK (
    bucket_id = 'shop-documents'
    AND is_active_org_member(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY shop_documents_delete ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'shop-documents'
    AND is_active_org_member(((storage.foldername(name))[1])::uuid)
  );

-- =========================================================================
-- Final lockdown: audit_log is append-only at the grant level too.
-- INSERT/SELECT remain available (the trigger inserts via SECURITY DEFINER;
-- SELECT is governed by the RLS policy above).
-- =========================================================================

REVOKE UPDATE, DELETE, TRUNCATE ON TABLE audit_log FROM PUBLIC, authenticated, anon, service_role;
