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

export const MIGRATIONS_DIR = path.resolve(__dirname, "../../../supabase/migrations");

/** Every migration file, applied in filename order (0001, then 0002, ...). */
export function migrationFiles(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

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
  -- Minimal stand-in for Supabase's storage.buckets so 0002 can register the
  -- private shop-documents bucket.
  CREATE TABLE storage.buckets (
    id text PRIMARY KEY,
    name text NOT NULL,
    public boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
  );
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

  -- Supabase ships default privileges in schema public (pg_default_acl, owned by
  -- postgres / supabase_admin) that AUTOMATICALLY grant ALL on every new
  -- table/sequence and EXECUTE on every new function to anon, authenticated and
  -- service_role. A migration's plain "REVOKE ... FROM PUBLIC" does NOT remove
  -- these *direct role* grants, so a function/table is still reachable by anon
  -- unless the migration also revokes from anon explicitly. We reproduce the
  -- defaults here, BEFORE applying the migrations, so the grant-lockdown tests
  -- exercise the same hazard the live project has -- otherwise "anon denied
  -- EXECUTE" would pass for the wrong reason (PGlite grants no such defaults).
  -- These apply to objects created AFTER this statement by the current
  -- (migration-owner) role, i.e. everything the migrations create in public.
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
`;

/**
 * storage.objects lives in the (stubbed) storage schema, which the public-schema
 * default privileges above do not cover; Supabase grants the storage roles table
 * access there directly. RLS on storage.objects still governs every row. Run
 * AFTER the migrations so nothing in them is relied on to pre-exist. We no longer
 * grant the PUBLIC-schema tables here: the emulated default privileges above
 * already grant them (as the live project does), and the migrations then revoke
 * down to the intended surface -- emulating, not papering over, the real grants.
 */
const POST_MIGRATION_GRANTS = `
  GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated, service_role;
`;

export async function createTestDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(BOOTSTRAP);
  for (const file of migrationFiles()) {
    const migration = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
    await db.exec(migration);
  }
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
  /** Goes to user_metadata.full_name — the user-editable, NOT-trusted name. */
  fullName?: string;
  /** Goes to app_metadata.full_name — a signed, server-controlled fallback name. */
  appFullName?: string;
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
          ...(claims.appFullName != null ? { app_metadata: { full_name: claims.appFullName } } : {}),
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
