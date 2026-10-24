import fs from "node:fs";
import path from "node:path";
import { PGlite, type PGliteInterface } from "@electric-sql/pglite";

/**
 * Real-Postgres test harness for the Slice 1 migration, backed by PGlite
 * (an in-process WASM Postgres). It stubs *only* the Supabase-provided pieces
 * the migration references at runtime -- the auth and storage schemas, the
 * anon/authenticated/service_role roles, and auth.uid()/auth.jwt() -- so the
 * migration SQL itself is exercised verbatim.
 *
 * None of this bootstrap lives in the migration: Supabase ships it in a real
 * project. The migration is read from disk and applied unchanged.
 */

export const MIGRATION_PATH = path.resolve(
  __dirname,
  "../../../supabase/migrations/0001_slice1_multi_shop_foundation_and_audit_log.sql",
);

/** Supabase stand-ins: roles, the auth schema (uid/jwt/role), and the storage schema. */
const BOOTSTRAP = `
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE ROLE service_role NOLOGIN BYPASSRLS;

  CREATE SCHEMA auth;
  CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  $$;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT NULLIF(NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid;
  $$;
  CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
  $$;

  CREATE SCHEMA storage;
  -- Minimal stand-in for Supabase's storage.foldername(name): split the object
  -- path on '/'. Element [1] is the leading segment (the Shop's org_id folder).
  CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
    SELECT string_to_array(name, '/');
  $$;
  CREATE TABLE storage.objects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  ALTER TABLE storage.objects FORCE ROW LEVEL SECURITY;

  GRANT USAGE ON SCHEMA auth, storage, public TO anon, authenticated, service_role;
`;

/**
 * Table grants Supabase applies to its roles. Run AFTER the migration so the
 * migration's final REVOKE of UPDATE/DELETE/TRUNCATE on audit_log is not undone.
 * We deliberately grant SELECT-only on audit_log to authenticated.
 */
const POST_MIGRATION_GRANTS = `
  GRANT SELECT, INSERT, UPDATE ON organizations TO authenticated;
  GRANT SELECT, INSERT, UPDATE ON org_memberships TO authenticated;
  GRANT SELECT ON audit_log TO authenticated;
  GRANT SELECT ON organizations, org_memberships, audit_log TO anon;
  GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated, anon;
`;

export async function createTestDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(BOOTSTRAP);
  const migration = fs.readFileSync(MIGRATION_PATH, "utf-8");
  await db.exec(migration);
  await db.exec(POST_MIGRATION_GRANTS);
  return db;
}

/**
 * Clone a fully-migrated base DB into an independent copy for a single test.
 * Cloning the data directory is far cheaper than re-applying the migration SQL,
 * so tests build the base once in beforeAll and take a fresh clone per test --
 * each test still gets a pristine, isolated Postgres without the per-test cost
 * (and flake risk) of re-running the migration.
 */
export function cloneTestDb(base: PGliteInterface): Promise<PGliteInterface> {
  return base.clone();
}

export interface ActingClaims {
  sub?: string | null;
  role?: "anon" | "authenticated" | "service_role";
  email?: string;
  fullName?: string;
}

/**
 * Run `fn` with the session bound to a given role + JWT claims, matching how
 * PostgREST executes a request (SET ROLE + request.jwt.claims). Session-level
 * (is_local = false) so it survives PGlite's per-statement autocommit, then
 * fully reset afterwards.
 */
export async function acting<T>(db: PGliteInterface, claims: ActingClaims, fn: () => Promise<T>): Promise<T> {
  const role = claims.role ?? "authenticated";
  const jwt =
    claims.sub === undefined && claims.email === undefined && claims.role === undefined
      ? null
      : JSON.stringify({
          ...(claims.sub != null ? { sub: claims.sub } : {}),
          role,
          ...(claims.email != null ? { email: claims.email } : {}),
          ...(claims.fullName != null ? { user_metadata: { full_name: claims.fullName } } : {}),
        });

  await db.query("SELECT set_config('request.jwt.claims', $1, false)", [jwt ?? ""]);
  await db.exec(`SET ROLE ${role};`);
  try {
    return await fn();
  } finally {
    await db.exec("RESET ROLE;");
    await db.query("SELECT set_config('request.jwt.claims', '', false)", []);
  }
}

/* ---------------------------------------------------------------------- */
/* Deterministic two-Shop fixture, seeded as the bootstrap superuser       */
/* (which bypasses RLS) so tests start from a known cross-tenant state.    */
/* ---------------------------------------------------------------------- */

export const ORG_A = "00a00001-1111-4111-8111-111111111111";
export const ORG_B = "00a00002-2222-4222-8222-222222222222";

export const A_ADMIN_USER = "a0000001-0000-4000-8000-000000000001";
export const A_ADMIN_MEMBER = "a0000001-0000-4000-8000-0000000000a1";
export const A_INSPECTOR_USER = "a0000002-0000-4000-8000-000000000002";
export const A_INSPECTOR_MEMBER = "a0000002-0000-4000-8000-0000000000a2";
export const A_MECH_USER = "a0000003-0000-4000-8000-000000000003";
export const A_MECH_MEMBER = "a0000003-0000-4000-8000-0000000000a3";

export const B_ADMIN_USER = "b0000001-0000-4000-8000-000000000001";
export const B_ADMIN_MEMBER = "b0000001-0000-4000-8000-0000000000b1";

export async function seedTwoShops(db: PGliteInterface): Promise<void> {
  await db.exec(`
    INSERT INTO organizations (id, slug, name, tool_id_prefix, timezone)
    VALUES
      ('${ORG_A}', 'org-apex-h1', 'Apex Charter MX', 'TL', 'America/Los_Angeles'),
      ('${ORG_B}', 'org-cascade-fs', 'Cascade Flight Services', 'CFS', 'America/Denver');

    INSERT INTO org_memberships (id, org_id, user_id, email, full_name, role, status)
    VALUES
      ('${A_ADMIN_MEMBER}', '${ORG_A}', '${A_ADMIN_USER}', 'admin.a@apexchartermx.example', 'Admin A', 'admin', 'active'),
      ('${A_INSPECTOR_MEMBER}', '${ORG_A}', '${A_INSPECTOR_USER}', 'insp.a@apexchartermx.example', 'Inspector A', 'inspector', 'active'),
      ('${A_MECH_MEMBER}', '${ORG_A}', '${A_MECH_USER}', 'mech.a@apexchartermx.example', 'Mechanic A', 'mechanic', 'active'),
      ('${B_ADMIN_MEMBER}', '${ORG_B}', '${B_ADMIN_USER}', 'admin.b@cascadeflightservices.example', 'Admin B', 'admin', 'active');
  `);
}

/** Convenience: claims for an active Shop member acting through PostgREST. */
export function member(sub: string, email: string, fullName: string): ActingClaims {
  return { sub, email, fullName, role: "authenticated" };
}
