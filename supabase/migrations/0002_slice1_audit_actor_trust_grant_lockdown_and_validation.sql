-- Slice 1 follow-ups (PR #28 / #38 review round 2)
-- Issue #28
--
-- Applies cleanly ON TOP OF 0001 (which is already live and is never edited).
-- Idempotent where reasonable so it can be re-run safely.
--
-- Implements the reviewer's remaining SQL findings:
--   6.  Audit actor_name comes from a trusted source (the actor's own
--       org_memberships.full_name for the Shop), not the user-editable
--       user_metadata.full_name. Falls back to the signed app_metadata
--       full_name, then the JWT email. actor_user_id / actor_email stay
--       from auth.uid() / the JWT.
--   7.  REVOKE INSERT on audit_log from every role (incl. service_role). The
--       SECURITY DEFINER capture trigger is the only writer.
--   8.  Lock down EXECUTE on the SECURITY DEFINER / trigger functions against
--       Supabase's default privileges (which GRANT EXECUTE on every new function
--       directly to anon/authenticated/service_role, so a REVOKE FROM PUBLIC is
--       not enough): deny PUBLIC + anon + service_role everywhere; also deny
--       authenticated on is_platform_owner and the trigger functions (a firing
--       trigger needs no EXECUTE grant); keep authenticated EXECUTE only on the
--       helpers RLS policies call as the invoking user (has_org_role,
--       is_active_org_member, storage_object_org_id). Finding 8b strips the
--       analogous default table grants from anon (and platform_owners wholesale
--       from anon + authenticated).
--   9.  Create the private shop-documents storage bucket.
--   10a. Make org_memberships.org_id immutable so an org_id change can't slip
--        past the Last-Admin Guard.
--   10b. Bound missing_tool_threshold_days / stale_aircraft_days so a value
--        above the Postgres integer range can't be stored (matches the UI).
--   10c. Validate organizations.timezone against pg_timezone_names.

-- =========================================================================
-- 6. Trusted audit actor_name
-- =========================================================================
CREATE OR REPLACE FUNCTION record_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  rec jsonb := to_jsonb(COALESCE(NEW, OLD));
  claims jsonb := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  v_org_id uuid := COALESCE(NULLIF(rec ->> 'org_id', '')::uuid, (rec ->> 'id')::uuid);
  v_actor_user_id uuid := auth.uid();
  v_actor_name text;
BEGIN
  -- Trusted name: the acting user's own membership full_name in THIS Shop.
  -- That column is only ever written by Admin-gated, RLS-checked writes, so it
  -- cannot be self-edited the way user_metadata.full_name can.
  IF v_actor_user_id IS NOT NULL THEN
    SELECT m.full_name INTO v_actor_name
    FROM org_memberships m
    WHERE m.org_id = v_org_id
      AND m.user_id = v_actor_user_id
    LIMIT 1;
  END IF;

  -- Fallbacks for trusted server-side / provisioning writes with no membership
  -- (e.g. the service role): the signed app_metadata full_name, then the email.
  -- Never user_metadata, which the end user controls.
  v_actor_name := COALESCE(
    v_actor_name,
    claims #>> '{app_metadata,full_name}',
    claims ->> 'email'
  );

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
    v_org_id,
    v_actor_user_id,
    claims ->> 'email',
    v_actor_name,
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

-- =========================================================================
-- 10a. org_memberships.org_id is immutable
-- =========================================================================
CREATE OR REPLACE FUNCTION prevent_org_membership_org_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.org_id IS DISTINCT FROM OLD.org_id THEN
    RAISE EXCEPTION 'ORG_ID_IMMUTABLE: org_memberships.org_id cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_org_memberships_prevent_org_change ON org_memberships;
CREATE TRIGGER trg_org_memberships_prevent_org_change
  BEFORE UPDATE ON org_memberships
  FOR EACH ROW
  EXECUTE FUNCTION prevent_org_membership_org_change();

-- =========================================================================
-- 10c. Validate the Shop time zone against the IANA set
-- =========================================================================
CREATE OR REPLACE FUNCTION validate_organization_timezone()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = NEW.timezone) THEN
    RAISE EXCEPTION 'INVALID_TIMEZONE: % is not a recognized IANA time zone name', NEW.timezone
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_organizations_validate_timezone ON organizations;
CREATE TRIGGER trg_organizations_validate_timezone
  BEFORE INSERT OR UPDATE OF timezone ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION validate_organization_timezone();

-- =========================================================================
-- 10b. Bound the open-ended integer settings so a value outside the Postgres
--      integer range can never be stored. These mirror the UI / in-memory
--      caps exactly (10 years). due_soon_days (1..365) and idle_timeout_minutes
--      (5..480) are already fully bounded in 0001.
-- =========================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organizations_missing_tool_threshold_days_max') THEN
    ALTER TABLE organizations
      ADD CONSTRAINT organizations_missing_tool_threshold_days_max
      CHECK (missing_tool_threshold_days <= 3650);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organizations_stale_aircraft_days_max') THEN
    ALTER TABLE organizations
      ADD CONSTRAINT organizations_stale_aircraft_days_max
      CHECK (stale_aircraft_days <= 3650);
  END IF;
END $$;

-- =========================================================================
-- 9. Private shop-documents storage bucket (ADR-0001). The storage.objects
--    RLS policies for it already live in 0001.
-- =========================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-documents', 'shop-documents', false)
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- 7. audit_log is append-only at the grant level for EVERY role. The capture
--    trigger (record_audit_log, SECURITY DEFINER, owned by the migration role)
--    is the only writer and does not rely on these grants.
-- =========================================================================
REVOKE INSERT ON TABLE audit_log FROM PUBLIC, anon, authenticated, service_role;

-- =========================================================================
-- 8. Function EXECUTE lockdown
--
-- CRITICAL: a Supabase project ships default privileges in schema public
-- (pg_default_acl, owned by postgres / supabase_admin) that GRANT EXECUTE on
-- every newly created function DIRECTLY to anon, authenticated and
-- service_role. A plain "REVOKE EXECUTE ... FROM PUBLIC" does NOT remove those
-- direct role grants -- so each function below must revoke from the roles by
-- name, not just from PUBLIC, or anon keeps EXECUTE on the live project.
-- (0001 already revokes anon/authenticated from provision_shop by name and is
-- therefore locked down; the helpers/trigger functions below were only revoked
-- from PUBLIC in 0001, so they are tightened here.)
-- =========================================================================

-- Trigger functions: a firing trigger never checks EXECUTE on its function, so
-- no role needs a direct grant. Deny everyone (defense in depth against a
-- hand-rolled direct call) -- PUBLIC and every Supabase role by name.
REVOKE EXECUTE ON FUNCTION record_audit_log() FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION enforce_last_admin_guard() FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION prevent_org_membership_hard_delete() FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION prevent_audit_log_mutation() FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION prevent_truncate() FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION prevent_org_membership_org_change() FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION validate_organization_timezone() FROM PUBLIC, anon, authenticated, service_role;

-- is_platform_owner is only ever called INSIDE provision_shop (SECURITY
-- DEFINER). No direct caller needs it; authenticated must not be able to probe
-- it, and service_role reaches provisioning through provision_shop, not here.
-- provision_shop keeps calling it fine because that happens as the function
-- owner, not as the invoking role.
REVOKE EXECUTE ON FUNCTION is_platform_owner() FROM PUBLIC, anon, authenticated, service_role;

-- Helpers evaluated INSIDE RLS policies run as the invoking role, so
-- authenticated keeps EXECUTE while PUBLIC, anon and service_role are denied.
-- (anon can never be an active member; service_role has BYPASSRLS so it never
-- evaluates these policies; and they are only ever referenced from policies.)
REVOKE EXECUTE ON FUNCTION is_active_org_member(uuid) FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION has_org_role(uuid, text[]) FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION storage_object_org_id(text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION is_active_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION has_org_role(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION storage_object_org_id(text) TO authenticated;

-- =========================================================================
-- 8b. Table-grant lockdown against the same Supabase default privileges, which
--     also GRANT ALL on every new table to anon, authenticated and
--     service_role. RLS already denies anon (it can never be an active member),
--     but strip the write privileges anon has no business holding so the only
--     grant anon retains on a tenant table is SELECT (still RLS-gated). audit_log
--     INSERT/UPDATE/DELETE/TRUNCATE are already revoked from anon (finding 7
--     above and 0001's final lockdown).
-- =========================================================================
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE organizations FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE org_memberships FROM anon;

-- platform_owners is deliberately opaque to tenants: no RLS policies, read only
-- through the SECURITY DEFINER helpers (which run as the owner) or the service
-- role. Neither anon nor authenticated should hold ANY direct grant on it.
REVOKE ALL ON TABLE platform_owners FROM anon, authenticated;
