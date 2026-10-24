-- Slice 1 follow-ups (PR #28 / #38 review round 3)
-- Issue #28
--
-- Applies cleanly ON TOP OF 0001 + 0002 (both already live and never edited).
-- Idempotent where reasonable so it can be re-run safely.
--
-- Implements the reviewer's round-3 SQL findings:
--   1. Signed-out (anon) reads must return nothing, not raise a function error.
--      0002 revoked anon EXECUTE on the RLS helper functions, but the 0001
--      policies still applied to ALL roles, so Postgres evaluated the helper
--      (and failed on the missing EXECUTE) when planning an anon query against
--      organizations / org_memberships / audit_log and against storage.objects
--      for ANY bucket. Fix: scope every 0001 policy TO authenticated (so anon
--      never evaluates a helper), strip anon's remaining direct grants on the
--      tenant tables, and revoke TRUNCATE/TRIGGER/REFERENCES from the app roles.
--   2. Audit reason (AC 2) had no supported write path: record_audit_log always
--      wrote reason = NULL and INSERT on audit_log is revoked from every role.
--      Fix: the capture trigger now reads a TRANSACTION-LOCAL GUC
--      (hangar.audit_reason), trimmed and length-capped; actor fields stay from
--      auth.uid() / the signed JWT only. SECURITY INVOKER RPCs let the app set
--      that GUC and perform the write in one call with RLS still applying.
--   8. The audit UPDATE triggers are recreated with a WHEN (OLD.* IS DISTINCT
--      FROM NEW.*) guard so a no-op UPDATE records no audit row.
--   6. Correcting COMMENTs for the functions / table whose behavior the stale
--      0001 comments described inaccurately.

-- =========================================================================
-- 1. Make anon reads return nothing instead of a function-permission error.
--
-- Background on the inaccurate 0002 comment (0002:221-223): it claimed "the
-- only grant anon retains on a tenant table is SELECT (still RLS-gated)". That
-- was wrong on two counts:
--   (a) anon also retained the default REFERENCES and TRIGGER grants (0002 only
--       stripped INSERT/UPDATE/DELETE/TRUNCATE), and authenticated/service_role
--       kept TRUNCATE/TRIGGER/REFERENCES too; and
--   (b) retaining anon SELECT was itself the bug: the 0001 policies apply to all
--       roles, so an anon SELECT planned the policy USING expression, which calls
--       is_active_org_member / has_org_role — functions anon no longer has
--       EXECUTE on after 0002 — raising "permission denied for function ...".
-- Corrected state after this migration: anon holds NO direct privilege on the
-- tenant tables (so an anon SELECT is a clean table-level "permission denied",
-- never a function error), and every 0001 policy is scoped TO authenticated so
-- anon never evaluates a helper function for any table, including storage.objects
-- for any bucket (a future public bucket's anon reads simply match no policy and
-- return zero rows).
-- =========================================================================

-- Scope every 0001 policy to the authenticated role. anon (and any other role)
-- then matches no policy and, under FORCE RLS, sees zero rows without the helper
-- ever being evaluated.
ALTER POLICY organizations_select ON organizations TO authenticated;
ALTER POLICY organizations_update ON organizations TO authenticated;
ALTER POLICY org_memberships_select ON org_memberships TO authenticated;
ALTER POLICY org_memberships_insert ON org_memberships TO authenticated;
ALTER POLICY org_memberships_update ON org_memberships TO authenticated;
ALTER POLICY audit_log_select ON audit_log TO authenticated;

-- The storage.objects policies are evaluated for EVERY storage query regardless
-- of bucket, so scope them too — otherwise an anon read of any other bucket
-- still trips is_active_org_member / has_org_role.
ALTER POLICY shop_documents_select ON storage.objects TO authenticated;
ALTER POLICY shop_documents_insert ON storage.objects TO authenticated;
ALTER POLICY shop_documents_update ON storage.objects TO authenticated;
ALTER POLICY shop_documents_delete ON storage.objects TO authenticated;

-- anon has no business holding ANY direct grant on the tenant tables. Strip them
-- all: a signed-out read is now a clean, RLS-independent table-permission error.
REVOKE ALL ON TABLE organizations FROM anon;
REVOKE ALL ON TABLE org_memberships FROM anon;
REVOKE ALL ON TABLE audit_log FROM anon;
-- platform_owners already had ALL revoked from anon in 0002; repeat for clarity.
REVOKE ALL ON TABLE platform_owners FROM anon;

-- TRUNCATE / TRIGGER / REFERENCES on the app tables are not part of the intended
-- surface for the application roles (TRUNCATE is additionally blocked by the
-- 0001 statement-level guard). Remove them from authenticated and service_role.
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE organizations FROM authenticated, service_role;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE org_memberships FROM authenticated, service_role;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE audit_log FROM authenticated, service_role;

-- =========================================================================
-- 2. Audit reason: a supported, trusted write path.
--
-- record_audit_log now reads the reason from a transaction-local GUC
-- (hangar.audit_reason), trimmed and capped at 2000 chars. A reason is
-- user-entered text, so taking it from the request is fine — but the ACTOR
-- (actor_user_id / actor_email / actor_name) is still resolved ONLY from
-- auth.uid() and the signed JWT / the actor's own membership, never from any
-- client-settable setting. Unset GUC => reason stays NULL (prior behavior for
-- plain trigger-captured writes).
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
  -- Transaction-local reason, set by the SECURITY INVOKER write RPCs below (or
  -- by a trusted server call via set_config(..., true)). Trimmed; empty => NULL;
  -- capped so a pathological value can't bloat the ledger.
  v_reason text := NULLIF(btrim(current_setting('hangar.audit_reason', true)), '');
BEGIN
  v_reason := left(v_reason, 2000);

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
    v_reason,
    to_jsonb(OLD),
    to_jsonb(NEW)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE EXECUTE ON FUNCTION record_audit_log() FROM PUBLIC, anon, authenticated, service_role;

-- =========================================================================
-- 8 (DB side). Recreate the audit capture triggers so a no-op UPDATE records
-- nothing: INSERT/DELETE fire unconditionally, UPDATE only when the row
-- actually changed. (The UI additionally disables Save and the in-memory store
-- skips no-op writes; this is the database backstop for a raw no-op UPDATE.)
-- =========================================================================
DROP TRIGGER IF EXISTS trg_organizations_audit_log ON organizations;
DROP TRIGGER IF EXISTS trg_org_memberships_audit_log ON org_memberships;
DROP TRIGGER IF EXISTS trg_organizations_audit_log_ins_del ON organizations;
DROP TRIGGER IF EXISTS trg_organizations_audit_log_upd ON organizations;
DROP TRIGGER IF EXISTS trg_org_memberships_audit_log_ins_del ON org_memberships;
DROP TRIGGER IF EXISTS trg_org_memberships_audit_log_upd ON org_memberships;

CREATE TRIGGER trg_organizations_audit_log_ins_del
  AFTER INSERT OR DELETE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION record_audit_log();
CREATE TRIGGER trg_organizations_audit_log_upd
  AFTER UPDATE ON organizations
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION record_audit_log();

CREATE TRIGGER trg_org_memberships_audit_log_ins_del
  AFTER INSERT OR DELETE ON org_memberships
  FOR EACH ROW
  EXECUTE FUNCTION record_audit_log();
CREATE TRIGGER trg_org_memberships_audit_log_upd
  AFTER UPDATE ON org_memberships
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION record_audit_log();

-- =========================================================================
-- 2 (RPCs). SECURITY INVOKER write RPCs the app can call in one round-trip,
-- passing a reason that reaches the audit trigger via a transaction-local GUC.
-- Because they run as the INVOKING user, every RLS policy, the Last-Admin Guard,
-- and the org_id-immutability guard still apply exactly as for a direct write —
-- so a cross-Shop write still fails (the UPDATE matches zero rows). Actor fields
-- are NEVER taken from a parameter; only the reason is.
--
-- EXECUTE is granted to authenticated only (anon/service_role explicitly denied,
-- overriding Supabase's default per-function grant to all three roles).
-- =========================================================================

CREATE OR REPLACE FUNCTION update_member_role_designations(
  p_member_id uuid,
  p_role text,
  p_is_cal_designee boolean,
  p_is_designated_auditor boolean,
  p_reason text DEFAULT NULL
)
RETURNS org_memberships
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row org_memberships;
BEGIN
  PERFORM set_config('hangar.audit_reason', COALESCE(p_reason, ''), true);
  UPDATE org_memberships
     SET role = p_role,
         is_cal_designee = p_is_cal_designee,
         is_designated_auditor = p_is_designated_auditor,
         updated_at = now()
   WHERE id = p_member_id
   RETURNING * INTO v_row;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'MEMBER_NOT_FOUND: no org_membership % is writable by you', p_member_id
      USING ERRCODE = 'no_data_found';
  END IF;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION deactivate_member(
  p_member_id uuid,
  p_reason text
)
RETURNS org_memberships
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row org_memberships;
BEGIN
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'REASON_REQUIRED: a reason is required to deactivate a Member'
      USING ERRCODE = 'check_violation';
  END IF;
  PERFORM set_config('hangar.audit_reason', p_reason, true);
  UPDATE org_memberships
     SET status = 'deactivated',
         deactivated_at = now(),
         deactivation_reason = p_reason,
         updated_at = now()
   WHERE id = p_member_id
   RETURNING * INTO v_row;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'MEMBER_NOT_FOUND: no org_membership % is writable by you', p_member_id
      USING ERRCODE = 'no_data_found';
  END IF;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION update_org_settings(
  p_org_id uuid,
  p_timezone text,
  p_tool_id_prefix text,
  p_due_soon_days integer,
  p_weekly_digest_day integer,
  p_weekly_digest_hour integer,
  p_weekly_digest_minute integer,
  p_missing_tool_threshold_days integer,
  p_stale_aircraft_days integer,
  p_idle_timeout_minutes integer,
  p_reason text DEFAULT NULL
)
RETURNS organizations
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row organizations;
BEGIN
  PERFORM set_config('hangar.audit_reason', COALESCE(p_reason, ''), true);
  UPDATE organizations
     SET timezone = p_timezone,
         tool_id_prefix = p_tool_id_prefix,
         due_soon_days = p_due_soon_days,
         weekly_digest_day = p_weekly_digest_day,
         weekly_digest_hour = p_weekly_digest_hour,
         weekly_digest_minute = p_weekly_digest_minute,
         missing_tool_threshold_days = p_missing_tool_threshold_days,
         stale_aircraft_days = p_stale_aircraft_days,
         idle_timeout_minutes = p_idle_timeout_minutes,
         updated_at = now()
   WHERE id = p_org_id
   RETURNING * INTO v_row;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORG_NOT_FOUND: no organization % is writable by you', p_org_id
      USING ERRCODE = 'no_data_found';
  END IF;
  RETURN v_row;
END;
$$;

REVOKE EXECUTE ON FUNCTION update_member_role_designations(uuid, text, boolean, boolean, text) FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION deactivate_member(uuid, text) FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION update_org_settings(uuid, text, text, integer, integer, integer, integer, integer, integer, integer, text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION update_member_role_designations(uuid, text, boolean, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION deactivate_member(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION update_org_settings(uuid, text, text, integer, integer, integer, integer, integer, integer, integer, text) TO authenticated;

-- =========================================================================
-- 6. Correcting COMMENTs documenting current behavior (the stale 0001 line
--    comments at 188-192, 351-356, and 496-497 are fixed in 0001 as comment-only
--    edits; these catalog comments make the current state queryable).
-- =========================================================================
COMMENT ON FUNCTION record_audit_log() IS
  'Append-only audit capture (ADR-0002). SECURITY DEFINER. Actor is resolved only from auth.uid() and the signed JWT / the actor''s own membership full_name; reason is read from the transaction-local GUC hangar.audit_reason (trimmed, capped at 2000 chars), set by the SECURITY INVOKER write RPCs. Active definition; supersedes the 0001 and 0002 bodies.';

COMMENT ON FUNCTION provision_shop(text, text, text, text, text, text) IS
  'Platform Owner Shop provisioning (ADR-0001). SECURITY DEFINER; gated by is_platform_owner(). In practice only reachable via the service role: no grant lets anon or authenticated EXECUTE it. Creates a Shop and its initial invited Admin without adding the caller to the roster.';

COMMENT ON FUNCTION is_platform_owner() IS
  'Authorization gate for provision_shop. Returns true for a service-role JWT, or for a signed-in auth.uid() registered in platform_owners. The platform_owners branch is reserved for a future signed-in Platform Owner path and is currently unreachable from a tenant session, because provision_shop is EXECUTE-able only by the service role.';

COMMENT ON TABLE platform_owners IS
  'Reserved registry of human accounts allowed to provision Shops on a future signed-in Platform Owner path. Deny-all RLS, no policies; readable only via SECURITY DEFINER helpers or the service role. Currently unused at runtime (the live provisioning path is service-role only); kept, not dropped.';
