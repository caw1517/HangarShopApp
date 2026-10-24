-- Slice 1: Multi-Shop Foundation, Append-Only Audit Log & Untitled UI 3-Column App Shell
-- Issue #28
--
-- Implements:
--   - organizations (Shop) and org_memberships (Member) tables
--   - Last-Admin Guard + hard-delete block on org_memberships (ADR-0002)
--   - append-only audit_log with capture trigger + immutability guard (ADR-0002)
--   - multi-tenant Row-Level Security via org_memberships (ADR-0001)
--   - platform-owner shop provisioning RPC for the Platform Owner flow
--   - storage.objects RLS for the shop-documents bucket (ADR-0001)
--
-- Notes:
--   - gen_random_uuid() is in Postgres core (>= 13), so no pgcrypto extension is
--     required. We deliberately add NO new extensions.
--   - The auth.* and storage.* schemas/functions are provided by Supabase at
--     runtime (and stubbed by the test harness); this migration only references
--     them, it never defines them.

-- =========================================================================
-- Tables
-- =========================================================================

-- organizations: a Shop (CONTEXT.md). Tenant root for all domain data.
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  -- Tool ID prefix is an alphanumeric token (e.g. 'TL', 'CFS'); the separator
  -- and sequence ('TL-0142') are added downstream. Reject blanks and values
  -- like '-5' so the DB rule matches the Settings UI validation.
  tool_id_prefix text NOT NULL DEFAULT 'TL' CHECK (tool_id_prefix ~ '^[A-Za-z0-9]{1,8}$'),
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

-- platform_owners: the small set of human accounts allowed to provision new
-- Shops when a call is NOT made with the service-role key. See provision_shop
-- and is_platform_owner() below. Keyed by auth user id (plain uuid, matching
-- org_memberships.user_id convention). Read only through SECURITY DEFINER
-- helpers or the service role; no direct policies are granted.
CREATE TABLE platform_owners (
  user_id uuid PRIMARY KEY,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================================================
-- Indexes
-- =========================================================================

CREATE INDEX idx_org_memberships_org_status ON org_memberships (org_id, status);
CREATE INDEX idx_org_memberships_org_role ON org_memberships (org_id, role);
-- Case-insensitive email uniqueness within a Shop (no citext dependency).
CREATE UNIQUE INDEX uq_org_memberships_org_email ON org_memberships (org_id, lower(email));
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
--
-- Concurrency: two transactions each demoting/deactivating a *different* admin
-- could each see the other still active under READ COMMITTED and both commit,
-- leaving zero admins. We serialize per-Shop with a transaction-scoped advisory
-- lock keyed on org_id before counting, so the second transaction blocks until
-- the first commits and then re-counts against the committed state.
CREATE OR REPLACE FUNCTION enforce_last_admin_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  remaining_active_admins integer;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'active' AND OLD.role = 'admin'
       AND NOT (NEW.status = 'active' AND NEW.role = 'admin') THEN
      PERFORM pg_advisory_xact_lock(hashtext('last_admin_guard:' || OLD.org_id::text));
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
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'active' AND OLD.role = 'admin' THEN
      PERFORM pg_advisory_xact_lock(hashtext('last_admin_guard:' || OLD.org_id::text));
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
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'HARD_DELETE_BLOCKED: org_memberships rows are deactivated, never deleted (ADR-0002)';
END;
$$;

-- Append-only audit capture (ADR-0002). SECURITY DEFINER so it can write to
-- audit_log regardless of the acting role's direct grants (UPDATE/DELETE on
-- audit_log are revoked from every role below).
--
-- Fields are read generically from to_jsonb(COALESCE(NEW, OLD)) so the same
-- function serves `organizations` (which has no org_id column; org_id falls
-- back to its own id) and `org_memberships`, and so DELETE (where NEW is NULL)
-- is handled without referencing missing record fields.
--
-- Trust model: only actor_user_id (auth.uid()) and the signed JWT claims
-- (email / full_name) are trusted. The reason column is NOT populated from any
-- client-settable session GUC here -- it is intentionally left NULL for
-- trigger-captured rows and is only set by trusted application/provisioning
-- writes (see provision_shop and the domain service layer).
CREATE OR REPLACE FUNCTION record_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  rec jsonb := to_jsonb(COALESCE(NEW, OLD));
  claims jsonb := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
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
    COALESCE(NULLIF(rec ->> 'org_id', '')::uuid, (rec ->> 'id')::uuid),
    auth.uid(),
    claims ->> 'email',
    COALESCE(claims #>> '{user_metadata,full_name}', claims ->> 'email'),
    TG_TABLE_NAME,
    (rec ->> 'id')::uuid,
    TG_OP,
    NULL,
    to_jsonb(OLD),
    to_jsonb(NEW)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Defensive immutability for audit_log rows (ADR-0002).
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'AUDIT_LOG_IMMUTABLE: audit_log rows cannot be updated or deleted (ADR-0002)';
END;
$$;

-- Statement-level TRUNCATE guard. REVOKE below removes TRUNCATE from granted
-- roles, but a superuser / table owner could still TRUNCATE and wipe the
-- ledger or an audited table; block it outright for defense in depth.
CREATE OR REPLACE FUNCTION prevent_truncate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'TRUNCATE_BLOCKED: % is append-only / audited and cannot be truncated', TG_TABLE_NAME;
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
  AFTER INSERT OR UPDATE OR DELETE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION record_audit_log();

CREATE TRIGGER trg_org_memberships_audit_log
  AFTER INSERT OR UPDATE OR DELETE ON org_memberships
  FOR EACH ROW
  EXECUTE FUNCTION record_audit_log();

CREATE TRIGGER trg_audit_log_prevent_mutation
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_mutation();

CREATE TRIGGER trg_audit_log_block_truncate
  BEFORE TRUNCATE ON audit_log
  FOR EACH STATEMENT
  EXECUTE FUNCTION prevent_truncate();

CREATE TRIGGER trg_organizations_block_truncate
  BEFORE TRUNCATE ON organizations
  FOR EACH STATEMENT
  EXECUTE FUNCTION prevent_truncate();

CREATE TRIGGER trg_org_memberships_block_truncate
  BEFORE TRUNCATE ON org_memberships
  FOR EACH STATEMENT
  EXECUTE FUNCTION prevent_truncate();

-- =========================================================================
-- Row-Level Security (ADR-0001)
-- =========================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;

ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_memberships FORCE ROW LEVEL SECURITY;

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;

ALTER TABLE platform_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_owners FORCE ROW LEVEL SECURITY;

-- =========================================================================
-- Helper functions (SECURITY DEFINER to read org_memberships under RLS)
-- =========================================================================

CREATE OR REPLACE FUNCTION is_active_org_member(target_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
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
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM org_memberships m
    WHERE m.org_id = target_org_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND m.role = ANY (allowed_roles)
  );
$$;

-- Authorization for provision_shop. Two accepted callers:
--   1. The service role (server-side calls made with the service-role key, the
--      primary and intended path -- never exposed to the browser).
--   2. A registered platform owner (a row in platform_owners keyed by auth.uid).
-- Everyone else is rejected. Kept SECURITY DEFINER so it can read platform_owners
-- under FORCE RLS.
CREATE OR REPLACE FUNCTION is_platform_owner()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  claims jsonb := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
BEGIN
  -- Canonical Supabase signal for a service-role call. current_user is NOT
  -- usable here: SECURITY DEFINER rebinds it to the function owner, so the
  -- signed JWT role claim is the trustworthy source.
  IF claims ->> 'role' = 'service_role' THEN
    RETURN true;
  END IF;
  RETURN auth.uid() IS NOT NULL
     AND EXISTS (SELECT 1 FROM platform_owners p WHERE p.user_id = auth.uid());
END;
$$;

-- Parse the leading path segment of a storage object name into an org uuid,
-- returning NULL (not raising) when it is not a valid uuid. Prevents a
-- 22P02 invalid_text_representation cast error on objects whose path does not
-- start with a uuid, which would otherwise abort the policy check.
CREATE OR REPLACE FUNCTION storage_object_org_id(object_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN (storage.foldername(object_name))[1]
      ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    THEN ((storage.foldername(object_name))[1])::uuid
    ELSE NULL
  END;
$$;

-- Platform Owner Shop provisioning RPC. Creates a new Shop and invites its
-- initial Admin without ever adding the caller to the new Shop's roster, so the
-- caller gains zero tenant read access to the Shop afterward (ADR-0001). The
-- in-function is_platform_owner() guard is the authoritative access gate; the
-- grants below ensure only the service role can even reach it from PostgREST.
CREATE OR REPLACE FUNCTION provision_shop(
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
SET search_path = public, pg_temp
AS $$
DECLARE
  new_org_id uuid;
BEGIN
  IF NOT is_platform_owner() THEN
    RAISE EXCEPTION 'NOT_PLATFORM_OWNER: only the platform owner may provision Shops'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

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

-- =========================================================================
-- Function grants
-- =========================================================================

-- Membership helpers: reveal only the caller's own membership, but there is no
-- reason for anon to probe them. Restrict to authenticated callers.
REVOKE EXECUTE ON FUNCTION is_active_org_member(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION has_org_role(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_active_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION has_org_role(uuid, text[]) TO authenticated;

-- provision_shop must never be callable by anon or ordinary authenticated
-- users (it bypasses RLS). Only the service role may invoke it, server-side.
REVOKE ALL ON FUNCTION provision_shop(text, text, text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION provision_shop(text, text, text, text, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION provision_shop(text, text, text, text, text, text) TO service_role;

-- =========================================================================
-- RLS policies
-- =========================================================================

-- organizations: no INSERT/DELETE policies for normal authenticated roles;
-- provisioning only happens via provision_shop (SECURITY DEFINER, bypasses RLS).
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

-- platform_owners: no policies. Readable only via SECURITY DEFINER helpers and
-- the service role (which bypasses RLS). Deliberately opaque to tenants.

-- =========================================================================
-- Storage policies: shop-documents bucket (ADR-0001)
-- Note: the shop-documents bucket itself must be created separately (e.g.
-- via the Supabase dashboard/API), not in this SQL migration.
-- Read/upload: any active Shop member. Overwrite/delete: Admin or Inspector
-- only, so a mechanic cannot destroy or replace a Shop's compliance documents.
-- =========================================================================

CREATE POLICY shop_documents_select ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'shop-documents'
    AND is_active_org_member(storage_object_org_id(name))
  );

CREATE POLICY shop_documents_insert ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'shop-documents'
    AND is_active_org_member(storage_object_org_id(name))
  );

CREATE POLICY shop_documents_update ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'shop-documents'
    AND has_org_role(storage_object_org_id(name), ARRAY['admin', 'inspector'])
  )
  WITH CHECK (
    bucket_id = 'shop-documents'
    AND has_org_role(storage_object_org_id(name), ARRAY['admin', 'inspector'])
  );

CREATE POLICY shop_documents_delete ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'shop-documents'
    AND has_org_role(storage_object_org_id(name), ARRAY['admin', 'inspector'])
  );

-- =========================================================================
-- Final lockdown: audit_log is append-only at the grant level too.
-- INSERT/SELECT remain available (the trigger inserts via SECURITY DEFINER;
-- SELECT is governed by the RLS policy above).
-- =========================================================================

REVOKE UPDATE, DELETE, TRUNCATE ON TABLE audit_log FROM PUBLIC, authenticated, anon, service_role;
