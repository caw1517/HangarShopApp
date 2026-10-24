import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { PGliteInterface } from "@electric-sql/pglite";
import {
  acting,
  A_ADMIN_MEMBER,
  A_ADMIN_USER,
  A_INSPECTOR_MEMBER,
  A_INSPECTOR_USER,
  A_MECH_MEMBER,
  A_MECH_USER,
  B_ADMIN_MEMBER,
  B_ADMIN_USER,
  cloneTestDb,
  createTestDb,
  member,
  ORG_A,
  ORG_B,
  seedTwoShops,
} from "./helpers/pg-harness";

/**
 * Real-Postgres (PGlite) verification of 0001_slice1_*.sql. These exercise the
 * migration file verbatim: RLS isolation, the append-only audit trigger across
 * INSERT/UPDATE/DELETE, the TRUNCATE guard, provisioning authorization, the
 * last-admin guard, and the storage policies.
 *
 * PGlite is a single in-process connection, so true multi-session concurrency
 * (the last-admin guard race) cannot be reproduced here; we verify the
 * functional guard and document that the advisory lock serializes concurrent
 * writers in a real multi-connection Postgres.
 */

const adminA = member(A_ADMIN_USER, "admin.a@apexchartermx.example", "Admin A");
const inspectorA = member(A_INSPECTOR_USER, "insp.a@apexchartermx.example", "Inspector A");
const mechA = member(A_MECH_USER, "mech.a@apexchartermx.example", "Mechanic A");
const adminB = member(B_ADMIN_USER, "admin.b@cascadeflightservices.example", "Admin B");

const SERVICE = { role: "service_role" as const };

// A single fully-migrated base DB is built once for the file; each test takes a
// fresh, isolated clone of it. Cloning the data dir is much cheaper than
// re-applying the migration per test, which keeps the real-Postgres suite fast
// and well clear of hook timeouts when files run in parallel under load.
let base: PGliteInterface;
let db: PGliteInterface;

async function rows(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
  const res = await db.query<Record<string, unknown>>(sql, params);
  return res.rows;
}

async function one(sql: string, params: unknown[] = []): Promise<Record<string, unknown>> {
  const r = await rows(sql, params);
  if (r.length === 0) throw new Error(`expected at least one row for: ${sql}`);
  return r[0]!;
}

beforeAll(async () => {
  base = await createTestDb();
});

afterAll(async () => {
  await base.close();
});

beforeEach(async () => {
  db = await cloneTestDb(base);
});

afterEach(async () => {
  await db.close();
});

describe("Migration applies cleanly on a real Postgres engine", () => {
  it("creates the core tables", async () => {
    const r = await rows(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' ORDER BY table_name`,
    );
    const names = r.map((x) => x.table_name);
    expect(names).toEqual(expect.arrayContaining(["audit_log", "org_memberships", "organizations", "platform_owners"]));
  });

  it("enables and forces RLS on every tenant table", async () => {
    const r = await rows(
      `SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class
       WHERE relname IN ('organizations','org_memberships','audit_log','platform_owners')`,
    );
    for (const t of r) {
      expect(t.relrowsecurity).toBe(true);
      expect(t.relforcerowsecurity).toBe(true);
    }
  });
});

describe("Blocker #1 regression — shop creation & settings save no longer crash the audit trigger", () => {
  it("inserts an organization (audit trigger reads org_id generically, falling back to id)", async () => {
    // Before the fix this raised: record "new" has no field "org_id".
    await db.exec(
      `INSERT INTO organizations (id, slug, name) VALUES ('${ORG_A}', 'org-apex-h1', 'Apex Charter MX')`,
    );
    const audit = await rows(
      `SELECT org_id, record_id, action FROM audit_log WHERE table_name='organizations' AND action='INSERT'`,
    );
    expect(audit).toHaveLength(1);
    expect(audit[0]!.org_id).toBe(ORG_A);
    expect(audit[0]!.record_id).toBe(ORG_A);
  });

  it("saves shop settings as an admin and records an UPDATE audit row", async () => {
    await seedTwoShops(db);
    const updated = await acting(db, adminA, () =>
      db.query(`UPDATE organizations SET due_soon_days = 45 WHERE id = '${ORG_A}'`),
    );
    expect(updated.affectedRows).toBe(1);
    const audit = await rows(
      `SELECT org_id, before_data->>'due_soon_days' AS before, after_data->>'due_soon_days' AS after
       FROM audit_log WHERE table_name='organizations' AND action='UPDATE'`,
    );
    expect(audit).toHaveLength(1);
    expect(audit[0]!.org_id).toBe(ORG_A);
    expect(audit[0]!.before).toBe("90");
    expect(audit[0]!.after).toBe("45");
  });
});

describe("Cross-Shop RLS isolation (ADR-0001)", () => {
  beforeEach(async () => {
    await seedTwoShops(db);
  });

  it("only lets a member see their own Shop's organization & roster", async () => {
    const orgs = await acting(db, adminA, () => rows(`SELECT id FROM organizations ORDER BY id`));
    expect(orgs.map((o) => o.id)).toEqual([ORG_A]);

    const members = await acting(db, adminA, () => rows(`SELECT org_id FROM org_memberships`));
    expect(members).toHaveLength(3);
    expect(members.every((m) => m.org_id === ORG_A)).toBe(true);

    const bFromA = await acting(db, adminA, () => rows(`SELECT id FROM organizations WHERE id = '${ORG_B}'`));
    expect(bFromA).toHaveLength(0);
  });

  it("stops a member of Shop B from writing Shop A's roster", async () => {
    const res = await acting(db, adminB, () =>
      db.query(`UPDATE org_memberships SET role='inspector' WHERE id='${A_MECH_MEMBER}'`),
    );
    expect(res.affectedRows).toBe(0);
    const stillMech = await one(`SELECT role FROM org_memberships WHERE id='${A_MECH_MEMBER}'`);
    expect(stillMech.role).toBe("mechanic");
  });

  it("restricts audit_log reads to Admin + Inspector, scoped to the Shop", async () => {
    // Generate at least one audit row in Shop A.
    await acting(db, adminA, () => db.query(`UPDATE organizations SET due_soon_days=80 WHERE id='${ORG_A}'`));

    const asAdmin = await acting(db, adminA, () => rows(`SELECT id FROM audit_log`));
    expect(asAdmin.length).toBeGreaterThan(0);

    const asInspector = await acting(db, inspectorA, () => rows(`SELECT id FROM audit_log`));
    expect(asInspector.length).toBeGreaterThan(0);

    const asMechanic = await acting(db, mechA, () => rows(`SELECT id FROM audit_log`));
    expect(asMechanic).toHaveLength(0);

    // Admin B sees only Shop B's own audit rows (seeded inserts), never Shop A's.
    const asOtherShop = await acting(db, adminB, () => rows(`SELECT org_id FROM audit_log`));
    expect(asOtherShop.length).toBeGreaterThan(0);
    expect(asOtherShop.every((r) => r.org_id === ORG_B)).toBe(true);
  });
});

describe("Append-only audit capture & actor trust (ADR-0002)", () => {
  beforeEach(async () => {
    await seedTwoShops(db);
  });

  it("captures INSERT with the authenticated actor from the signed JWT, not spoofable GUCs", async () => {
    await acting(db, adminA, async () => {
      // Attempt to spoof the actor via a client-settable session GUC.
      await db.query("SELECT set_config('app.current_actor_email', 'attacker@evil.example', false)");
      await db.query(
        `INSERT INTO org_memberships (org_id, user_id, email, full_name, role, status)
         VALUES ('${ORG_A}', NULL, 'new.hire@apexchartermx.example', 'New Hire', 'mechanic', 'invited')`,
      );
    });
    const audit = await one(
      `SELECT actor_user_id, actor_email, actor_name, action, before_data, after_data->>'email' AS email
       FROM audit_log WHERE table_name='org_memberships' AND action='INSERT'
       AND after_data->>'email' = 'new.hire@apexchartermx.example'`,
    );
    expect(audit.actor_user_id).toBe(A_ADMIN_USER);
    expect(audit.actor_email).toBe("admin.a@apexchartermx.example"); // from JWT, not the spoofed GUC
    expect(audit.actor_name).toBe("Admin A");
    expect(audit.before_data).toBeNull();
    expect(audit.email).toBe("new.hire@apexchartermx.example");
  });

  it("captures UPDATE with before/after snapshots", async () => {
    await acting(db, adminA, () =>
      db.query(`UPDATE org_memberships SET role='inspector' WHERE id='${A_MECH_MEMBER}'`),
    );
    const audit = await one(
      `SELECT before_data->>'role' AS before, after_data->>'role' AS after
       FROM audit_log WHERE table_name='org_memberships' AND action='UPDATE' AND record_id='${A_MECH_MEMBER}'`,
    );
    expect(audit.before).toBe("mechanic");
    expect(audit.after).toBe("inspector");
  });

  it("captures DELETE (OLD snapshot, record_id, NULL after) via record_audit_log's DELETE branch", async () => {
    // Hard delete is blocked in production (see the dedicated test below); drop
    // that guard here to isolate record_audit_log's DELETE handling, which is
    // the behavior under review. The AFTER audit trigger stays in place.
    await db.exec(`DROP TRIGGER trg_org_memberships_block_hard_delete ON org_memberships`);
    await db.exec(`DELETE FROM org_memberships WHERE id='${A_MECH_MEMBER}'`);
    const audit = await one(
      `SELECT org_id, record_id, action, before_data->>'email' AS before_email, after_data
       FROM audit_log WHERE table_name='org_memberships' AND action='DELETE'`,
    );
    expect(audit.action).toBe("DELETE");
    expect(audit.org_id).toBe(ORG_A);
    expect(audit.record_id).toBe(A_MECH_MEMBER);
    expect(audit.before_email).toBe("mech.a@apexchartermx.example");
    expect(audit.after_data).toBeNull();
  });

  it("blocks hard deletion of a member (deactivate, never delete)", async () => {
    await expect(db.exec(`DELETE FROM org_memberships WHERE id='${A_MECH_MEMBER}'`)).rejects.toThrow(
      /HARD_DELETE_BLOCKED/,
    );
  });

  it("rejects UPDATE and DELETE of audit_log rows even for the table owner", async () => {
    await acting(db, adminA, () => db.query(`UPDATE organizations SET due_soon_days=77 WHERE id='${ORG_A}'`));
    await expect(db.exec(`UPDATE audit_log SET reason='tamper' WHERE true`)).rejects.toThrow(/AUDIT_LOG_IMMUTABLE/);
    await expect(db.exec(`DELETE FROM audit_log WHERE true`)).rejects.toThrow(/AUDIT_LOG_IMMUTABLE/);
  });

  it("blocks TRUNCATE on the audit log and the audited tables", async () => {
    await expect(db.exec(`TRUNCATE audit_log`)).rejects.toThrow(/TRUNCATE_BLOCKED/);
    await expect(db.exec(`TRUNCATE org_memberships`)).rejects.toThrow(/TRUNCATE_BLOCKED/);
    // CASCADE so our BEFORE TRUNCATE guard fires rather than Postgres's
    // FK-reference restriction; the guard still blocks it.
    await expect(db.exec(`TRUNCATE organizations CASCADE`)).rejects.toThrow(/TRUNCATE_BLOCKED/);
  });
});

describe("Shop provisioning authorization (ADR-0001)", () => {
  const PROVISION = `SELECT provision_shop('Pacific Rotorcraft','org-pacific','PRM','America/Los_Angeles','admin@pacific.example','Priya Nakamura')`;

  it("lets the service role provision a Shop and invite its initial Admin", async () => {
    const res = await acting(db, SERVICE, () => db.query<{ provision_shop: { org_id: string } }>(PROVISION));
    const receipt = res.rows[0]!.provision_shop;
    expect(receipt.org_id).toBeTruthy();
    const org = await one(`SELECT name FROM organizations WHERE id = $1`, [receipt.org_id]);
    expect(org.name).toBe("Pacific Rotorcraft");
    const admin = await one(`SELECT role, status FROM org_memberships WHERE org_id = $1`, [receipt.org_id]);
    expect(admin.role).toBe("admin");
    expect(admin.status).toBe("invited");
  });

  it("denies EXECUTE to anon and to ordinary authenticated users", async () => {
    await expect(acting(db, { role: "anon" }, () => db.query(PROVISION))).rejects.toThrow(/permission denied/i);
    await expect(
      acting(db, member("c0000001-0000-4000-8000-000000000001", "nobody@x.example", "Nobody"), () =>
        db.query(PROVISION),
      ),
    ).rejects.toThrow(/permission denied/i);
  });

  it("rejects an invalid tool_id_prefix at provisioning time", async () => {
    const bad = `SELECT provision_shop('Bad Shop','org-bad','-5','America/Los_Angeles','a@b.example','A B')`;
    await expect(acting(db, SERVICE, () => db.query(bad))).rejects.toThrow(/tool_id_prefix|constraint/i);
  });

  it("denies anon and authenticated direct EXECUTE on is_platform_owner (0002 lockdown)", async () => {
    // is_platform_owner is only reachable inside provision_shop (SECURITY
    // DEFINER). No invoking role may call it directly to probe ownership.
    await expect(acting(db, { role: "anon" }, () => db.query(`SELECT is_platform_owner()`))).rejects.toThrow(
      /permission denied for function is_platform_owner/i,
    );
    await expect(
      acting(db, member("d0000009-0000-4000-8000-000000000009", "probe@x.example", "Probe"), () =>
        db.query(`SELECT is_platform_owner()`),
      ),
    ).rejects.toThrow(/permission denied for function is_platform_owner/i);
  });

  it("still authorizes a registered owner through the is_platform_owner logic (defense-in-depth path)", async () => {
    // The invoking roles can't call it, so exercise the SQL logic as the DB
    // owner (which can execute) with the signed sub claim set, proving the
    // registered-owner branch still returns true only for a registered owner.
    const ownerUid = "d0000001-0000-4000-8000-000000000001";
    const notOwnerUid = "d0000002-0000-4000-8000-000000000002";

    async function platformOwnerFor(sub: string): Promise<boolean> {
      await db.query("SELECT set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub, role: "authenticated" })]);
      try {
        const r = await rows(`SELECT is_platform_owner() AS ok`);
        return r[0]!.ok as boolean;
      } finally {
        await db.query("SELECT set_config('request.jwt.claims', '', false)", []);
      }
    }

    expect(await platformOwnerFor(ownerUid)).toBe(false);
    await db.query(`INSERT INTO platform_owners (user_id) VALUES ($1)`, [ownerUid]);
    expect(await platformOwnerFor(ownerUid)).toBe(true);
    expect(await platformOwnerFor(notOwnerUid)).toBe(false);
  });
});

describe("Last-Admin Guard (ADR-0002)", () => {
  beforeEach(async () => {
    await seedTwoShops(db);
  });

  it("blocks demoting the sole active Admin", async () => {
    await expect(
      acting(db, adminA, () => db.query(`UPDATE org_memberships SET role='mechanic' WHERE id='${A_ADMIN_MEMBER}'`)),
    ).rejects.toThrow(/LAST_ADMIN_GUARD/);
  });

  it("blocks deactivating the sole active Admin", async () => {
    await expect(
      acting(db, adminA, () =>
        db.query(`UPDATE org_memberships SET status='deactivated' WHERE id='${A_ADMIN_MEMBER}'`),
      ),
    ).rejects.toThrow(/LAST_ADMIN_GUARD/);
  });

  it("allows demoting an Admin once a second active Admin exists", async () => {
    await acting(db, adminA, () =>
      db.query(`UPDATE org_memberships SET role='admin' WHERE id='${A_INSPECTOR_MEMBER}'`),
    );
    const res = await acting(db, adminA, () =>
      db.query(`UPDATE org_memberships SET role='inspector' WHERE id='${A_ADMIN_MEMBER}'`),
    );
    expect(res.affectedRows).toBe(1);
    const a = await one(`SELECT role FROM org_memberships WHERE id='${A_ADMIN_MEMBER}'`);
    expect(a.role).toBe("inspector");
  });
});

describe("Storage policies for the shop-documents bucket (ADR-0001)", () => {
  beforeEach(async () => {
    await seedTwoShops(db);
  });

  it("lets any active member upload under their Shop's folder", async () => {
    const res = await acting(db, mechA, () =>
      db.query(`INSERT INTO storage.objects (bucket_id, name) VALUES ('shop-documents', '${ORG_A}/certs/cal.pdf')`),
    );
    expect(res.affectedRows).toBe(1);
  });

  it("forbids a mechanic from overwriting or deleting documents (Admin/Inspector only)", async () => {
    await acting(db, mechA, () =>
      db.query(`INSERT INTO storage.objects (bucket_id, name) VALUES ('shop-documents', '${ORG_A}/certs/cal.pdf')`),
    );
    const del = await acting(db, mechA, () =>
      db.query(`DELETE FROM storage.objects WHERE name='${ORG_A}/certs/cal.pdf'`),
    );
    expect(del.affectedRows).toBe(0);
    const upd = await acting(db, mechA, () =>
      db.query(`UPDATE storage.objects SET name='${ORG_A}/certs/renamed.pdf' WHERE name='${ORG_A}/certs/cal.pdf'`),
    );
    expect(upd.affectedRows).toBe(0);

    const adminDel = await acting(db, adminA, () =>
      db.query(`DELETE FROM storage.objects WHERE name='${ORG_A}/certs/cal.pdf'`),
    );
    expect(adminDel.affectedRows).toBe(1);
  });

  it("isolates documents across Shops", async () => {
    await db.exec(`INSERT INTO storage.objects (bucket_id, name) VALUES ('shop-documents', '${ORG_B}/certs/b.pdf')`);
    const seen = await acting(db, adminA, () =>
      rows(`SELECT name FROM storage.objects WHERE name = '${ORG_B}/certs/b.pdf'`),
    );
    expect(seen).toHaveLength(0);
  });

  it("handles object paths that do not start with a uuid without a cast exception", async () => {
    // Seeded as superuser (bypasses RLS); the SELECT below must NOT raise 22P02.
    await db.exec(`INSERT INTO storage.objects (bucket_id, name) VALUES ('shop-documents', 'not-a-uuid/x.pdf')`);
    const seen = await acting(db, adminA, () =>
      rows(`SELECT name FROM storage.objects WHERE name = 'not-a-uuid/x.pdf'`),
    );
    expect(seen).toHaveLength(0); // safely filtered out, not an error
  });
});

describe("Case-insensitive email uniqueness within a Shop", () => {
  beforeEach(async () => {
    await seedTwoShops(db);
  });

  it("rejects a duplicate email that differs only in case", async () => {
    await expect(
      db.exec(
        `INSERT INTO org_memberships (org_id, user_id, email, full_name, role, status)
         VALUES ('${ORG_A}', NULL, 'ADMIN.A@apexchartermx.example', 'Dup', 'mechanic', 'invited')`,
      ),
    ).rejects.toThrow(/uq_org_memberships_org_email|duplicate key/i);
  });
});

/* ======================================================================== */
/* 0002 follow-ups                                                          */
/* ======================================================================== */

describe("Audit actor_name is trusted, not user-editable (0002, finding 6)", () => {
  beforeEach(async () => {
    await seedTwoShops(db);
  });

  it("uses the actor's membership full_name, never the editable user_metadata.full_name", async () => {
    await acting(
      db,
      { sub: A_ADMIN_USER, email: "admin.a@apexchartermx.example", fullName: "Spoofed Name", role: "authenticated" },
      () =>
        db.query(
          `INSERT INTO org_memberships (org_id, user_id, email, full_name, role, status)
           VALUES ('${ORG_A}', NULL, 'hire2@apexchartermx.example', 'Hire Two', 'mechanic', 'invited')`,
        ),
    );
    const audit = await one(
      `SELECT actor_name, actor_email, actor_user_id FROM audit_log
       WHERE table_name='org_memberships' AND action='INSERT'
       AND after_data->>'email' = 'hire2@apexchartermx.example'`,
    );
    expect(audit.actor_name).toBe("Admin A"); // membership full_name, NOT "Spoofed Name"
    expect(audit.actor_email).toBe("admin.a@apexchartermx.example");
    expect(audit.actor_user_id).toBe(A_ADMIN_USER);
  });

  it("falls back to the signed app_metadata full_name when the writer has no membership", async () => {
    // The service role provisions a Shop (no membership of its own); the org
    // INSERT audit row must take its name from the signed app_metadata claim.
    const res = await acting(
      db,
      { role: "service_role", email: "svc@apex.example", appFullName: "Service Robot" },
      () =>
        db.query<{ provision_shop: { org_id: string } }>(
          `SELECT provision_shop('Fallback Shop','org-fallback','TL','America/Los_Angeles','admin@fallback.example','Fallback Admin')`,
        ),
    );
    const orgId = res.rows[0]!.provision_shop.org_id;
    const audit = await one(
      `SELECT actor_name, actor_email FROM audit_log WHERE table_name='organizations' AND org_id = $1`,
      [orgId],
    );
    expect(audit.actor_name).toBe("Service Robot"); // app_metadata, NOT user_metadata
    expect(audit.actor_email).toBe("svc@apex.example");
  });
});

describe("audit_log is append-only at the grant level (0002, finding 7)", () => {
  beforeEach(async () => {
    await seedTwoShops(db);
  });

  const DIRECT_INSERT = `INSERT INTO audit_log (org_id, table_name, record_id, action)
                         VALUES ('${ORG_A}', 'organizations', '${ORG_A}', 'INSERT')`;

  it("denies a direct INSERT into audit_log for service_role and authenticated", async () => {
    await expect(acting(db, SERVICE, () => db.query(DIRECT_INSERT))).rejects.toThrow(/permission denied/i);
    await expect(acting(db, adminA, () => db.query(DIRECT_INSERT))).rejects.toThrow(/permission denied/i);
  });

  it("still lets the SECURITY DEFINER capture trigger write audit rows", async () => {
    const before = await one(`SELECT count(*)::int AS n FROM audit_log WHERE org_id='${ORG_A}'`);
    await acting(db, adminA, () => db.query(`UPDATE organizations SET due_soon_days=120 WHERE id='${ORG_A}'`));
    const after = await one(`SELECT count(*)::int AS n FROM audit_log WHERE org_id='${ORG_A}'`);
    expect(after.n).toBe((before.n as number) + 1);
  });
});

describe("Function EXECUTE lockdown (0002, finding 8)", () => {
  beforeEach(async () => {
    await seedTwoShops(db);
  });

  it("denies anon direct EXECUTE on the RLS helper functions", async () => {
    await expect(acting(db, { role: "anon" }, () => db.query(`SELECT is_active_org_member('${ORG_A}')`))).rejects.toThrow(
      /permission denied for function is_active_org_member/i,
    );
    await expect(
      acting(db, { role: "anon" }, () => db.query(`SELECT has_org_role('${ORG_A}', ARRAY['admin'])`)),
    ).rejects.toThrow(/permission denied for function has_org_role/i);
    await expect(acting(db, { role: "anon" }, () => db.query(`SELECT storage_object_org_id('x/y.pdf')`))).rejects.toThrow(
      /permission denied for function storage_object_org_id/i,
    );
  });

  it("denies anon direct EXECUTE on the trigger functions", async () => {
    await expect(acting(db, { role: "anon" }, () => db.query(`SELECT record_audit_log()`))).rejects.toThrow(
      /permission denied for function record_audit_log/i,
    );
    await expect(acting(db, { role: "anon" }, () => db.query(`SELECT prevent_truncate()`))).rejects.toThrow(
      /permission denied for function prevent_truncate/i,
    );
  });

  it("keeps authenticated RLS working through the helpers it may still execute", async () => {
    const orgs = await acting(db, adminA, () => rows(`SELECT id FROM organizations`));
    expect(orgs.map((o) => o.id)).toEqual([ORG_A]);
    const self = await acting(db, adminA, () =>
      rows(`SELECT is_active_org_member('${ORG_A}') AS ok, has_org_role('${ORG_A}', ARRAY['admin']) AS is_admin`),
    );
    expect(self[0]!.ok).toBe(true);
    expect(self[0]!.is_admin).toBe(true);
  });
});

describe("Grant lockdown survives Supabase's default privileges (0002, findings 8 & 8b)", () => {
  // A live Supabase project ships default privileges in schema public that
  // GRANT EXECUTE on every new function and ALL on every new table directly to
  // anon/authenticated/service_role. REVOKE ... FROM PUBLIC does NOT undo those
  // direct grants. The harness reproduces those defaults before applying the
  // migrations, so these tests catch a migration that only revokes from PUBLIC.

  it("SANITY: the harness actually emulates the defaults (a fresh public function is EXECUTE-able by anon)", async () => {
    // Created by the same migration-owner role as the migration's functions, so
    // it inherits the emulated default privilege. If this is false the harness
    // is NOT emulating the defaults and every assertion below is vacuous.
    await db.exec(`CREATE FUNCTION public._scratch_default_priv() RETURNS int LANGUAGE sql AS 'SELECT 1'`);
    const scratch = await one(
      `SELECT has_function_privilege('anon', 'public._scratch_default_priv()', 'EXECUTE') AS anon,
              has_function_privilege('authenticated', 'public._scratch_default_priv()', 'EXECUTE') AS authed,
              has_function_privilege('service_role', 'public._scratch_default_priv()', 'EXECUTE') AS svc`,
    );
    expect(scratch.anon).toBe(true);
    expect(scratch.authed).toBe(true);
    expect(scratch.svc).toBe(true);
    // And a fresh public table is likewise fully granted by default.
    await db.exec(`CREATE TABLE public._scratch_default_priv_tbl (id int)`);
    const tbl = await one(
      `SELECT has_table_privilege('anon', 'public._scratch_default_priv_tbl', 'INSERT') AS anon_insert`,
    );
    expect(tbl.anon_insert).toBe(true);
  });

  it("revokes anon EXECUTE on every migration function despite the default grant (the regression: PUBLIC-only revokes would leave these true)", async () => {
    const fns = [
      "is_active_org_member(uuid)",
      "has_org_role(uuid, text[])",
      "storage_object_org_id(text)",
      "is_platform_owner()",
      "record_audit_log()",
      "enforce_last_admin_guard()",
      "prevent_org_membership_hard_delete()",
      "prevent_audit_log_mutation()",
      "prevent_truncate()",
      "prevent_org_membership_org_change()",
      "validate_organization_timezone()",
      "provision_shop(text, text, text, text, text, text)",
    ];
    for (const fn of fns) {
      const r = await one(`SELECT has_function_privilege('anon', '${fn}', 'EXECUTE') AS ok`);
      expect(r.ok, `anon should NOT have EXECUTE on ${fn}`).toBe(false);
    }
  });

  it("denies authenticated EXECUTE on is_platform_owner and every trigger function, but keeps the RLS helpers", async () => {
    const deniedForAuthed = [
      "is_platform_owner()",
      "record_audit_log()",
      "enforce_last_admin_guard()",
      "prevent_org_membership_hard_delete()",
      "prevent_audit_log_mutation()",
      "prevent_truncate()",
      "prevent_org_membership_org_change()",
      "validate_organization_timezone()",
      "provision_shop(text, text, text, text, text, text)",
    ];
    for (const fn of deniedForAuthed) {
      const r = await one(`SELECT has_function_privilege('authenticated', '${fn}', 'EXECUTE') AS ok`);
      expect(r.ok, `authenticated should NOT have EXECUTE on ${fn}`).toBe(false);
    }
    const helpers = ["is_active_org_member(uuid)", "has_org_role(uuid, text[])", "storage_object_org_id(text)"];
    for (const fn of helpers) {
      const r = await one(`SELECT has_function_privilege('authenticated', '${fn}', 'EXECUTE') AS ok`);
      expect(r.ok, `authenticated SHOULD keep EXECUTE on RLS helper ${fn}`).toBe(true);
    }
  });

  it("keeps provision_shop EXECUTE-able only by service_role", async () => {
    const fn = "provision_shop(text, text, text, text, text, text)";
    const r = await one(
      `SELECT has_function_privilege('service_role', '${fn}', 'EXECUTE') AS svc,
              has_function_privilege('anon', '${fn}', 'EXECUTE') AS anon,
              has_function_privilege('authenticated', '${fn}', 'EXECUTE') AS authed`,
    );
    expect(r.svc).toBe(true);
    expect(r.anon).toBe(false);
    expect(r.authed).toBe(false);
  });

  it("strips anon's default write grants on the tenant tables and locks platform_owners to the service role", async () => {
    // anon keeps only RLS-gated SELECT on the tenant tables; every write is gone.
    for (const tbl of ["organizations", "org_memberships"]) {
      const r = await one(
        `SELECT has_table_privilege('anon', '${tbl}', 'INSERT') AS ins,
                has_table_privilege('anon', '${tbl}', 'UPDATE') AS upd,
                has_table_privilege('anon', '${tbl}', 'DELETE') AS del`,
      );
      expect(r.ins, `anon INSERT on ${tbl}`).toBe(false);
      expect(r.upd, `anon UPDATE on ${tbl}`).toBe(false);
      expect(r.del, `anon DELETE on ${tbl}`).toBe(false);
    }
    // audit_log: no write of any kind for anon (findings 7 + 0001 final lockdown).
    const al = await one(
      `SELECT has_table_privilege('anon', 'audit_log', 'INSERT') AS ins,
              has_table_privilege('authenticated', 'audit_log', 'INSERT') AS authed_ins,
              has_table_privilege('authenticated', 'audit_log', 'SELECT') AS authed_sel`,
    );
    expect(al.ins).toBe(false);
    expect(al.authed_ins).toBe(false);
    expect(al.authed_sel).toBe(true); // SELECT survives; RLS still scopes it to admin/inspector
    // platform_owners: opaque to tenants, no direct grant for anon or authenticated.
    const po = await one(
      `SELECT has_table_privilege('anon', 'platform_owners', 'SELECT') AS anon_sel,
              has_table_privilege('authenticated', 'platform_owners', 'SELECT') AS authed_sel`,
    );
    expect(po.anon_sel).toBe(false);
    expect(po.authed_sel).toBe(false);
  });

  it("enforces the anon EXECUTE denial at runtime via SET ROLE, not just in the catalog", async () => {
    await expect(
      acting(db, { role: "anon" }, () => db.query(`SELECT is_active_org_member('${ORG_A}')`)),
    ).rejects.toThrow(/permission denied for function is_active_org_member/i);
    await expect(
      acting(db, { role: "anon" }, () => db.query(`SELECT record_audit_log()`)),
    ).rejects.toThrow(/permission denied for function record_audit_log/i);
  });

  it("keeps authenticated RLS fully working under the tightened grants", async () => {
    await seedTwoShops(db);
    const orgs = await acting(db, adminA, () => rows(`SELECT id FROM organizations`));
    expect(orgs.map((o) => o.id)).toEqual([ORG_A]);
    const res = await acting(db, adminA, () =>
      db.query(`UPDATE organizations SET due_soon_days=60 WHERE id='${ORG_A}'`),
    );
    expect(res.affectedRows).toBe(1);
  });
});

describe("Private shop-documents bucket exists (0002, finding 9)", () => {
  it("registers the shop-documents bucket as private", async () => {
    const bucket = await one(`SELECT id, name, public FROM storage.buckets WHERE id='shop-documents'`);
    expect(bucket.name).toBe("shop-documents");
    expect(bucket.public).toBe(false);
  });
});

describe("org_memberships.org_id is immutable (0002, finding 10a)", () => {
  beforeEach(async () => {
    await seedTwoShops(db);
  });

  it("blocks changing a membership's org_id (run as owner to isolate the guard from RLS)", async () => {
    await expect(
      db.exec(`UPDATE org_memberships SET org_id='${ORG_B}' WHERE id='${A_INSPECTOR_MEMBER}'`),
    ).rejects.toThrow(/ORG_ID_IMMUTABLE/);
  });

  it("still allows updates that leave org_id unchanged", async () => {
    await db.exec(`UPDATE org_memberships SET certificate_number='C-1' WHERE id='${A_INSPECTOR_MEMBER}'`);
    const m = await one(`SELECT certificate_number FROM org_memberships WHERE id='${A_INSPECTOR_MEMBER}'`);
    expect(m.certificate_number).toBe("C-1");
  });
});

describe("Open-ended day thresholds are bounded (0002, finding 10b)", () => {
  beforeEach(async () => {
    await seedTwoShops(db);
  });

  it("rejects a missing-tool threshold above the 10-year cap", async () => {
    await expect(
      acting(db, adminA, () => db.query(`UPDATE organizations SET missing_tool_threshold_days=4000 WHERE id='${ORG_A}'`)),
    ).rejects.toThrow(/missing_tool_threshold_days_max|violates check constraint/i);
  });

  it("rejects a stale-aircraft threshold above the 10-year cap", async () => {
    await expect(
      acting(db, adminA, () => db.query(`UPDATE organizations SET stale_aircraft_days=4000 WHERE id='${ORG_A}'`)),
    ).rejects.toThrow(/stale_aircraft_days_max|violates check constraint/i);
  });

  it("accepts a value at the cap", async () => {
    const res = await acting(db, adminA, () =>
      db.query(`UPDATE organizations SET missing_tool_threshold_days=3650, stale_aircraft_days=3650 WHERE id='${ORG_A}'`),
    );
    expect(res.affectedRows).toBe(1);
  });
});

describe("Shop time zone validation (0002, finding 10c)", () => {
  beforeEach(async () => {
    await seedTwoShops(db);
  });

  it("rejects an invalid time zone on update", async () => {
    await expect(
      acting(db, adminA, () => db.query(`UPDATE organizations SET timezone='Mars/Phobos' WHERE id='${ORG_A}'`)),
    ).rejects.toThrow(/INVALID_TIMEZONE/);
  });

  it("accepts a valid IANA time zone on update", async () => {
    const res = await acting(db, adminA, () =>
      db.query(`UPDATE organizations SET timezone='America/New_York' WHERE id='${ORG_A}'`),
    );
    expect(res.affectedRows).toBe(1);
  });

  it("rejects an invalid time zone at provisioning time", async () => {
    const bad = `SELECT provision_shop('Bad TZ Shop','org-bad-tz','TL','Mars/Phobos','a@b.example','A B')`;
    await expect(acting(db, SERVICE, () => db.query(bad))).rejects.toThrow(/INVALID_TIMEZONE/);
  });
});

/* ======================================================================== */
/* 0003 follow-ups                                                          */
/* ======================================================================== */

describe("Signed-out (anon) reads return nothing, never a function error (0003, finding 1)", () => {
  beforeEach(async () => {
    await seedTwoShops(db);
  });

  it("denies anon SELECT on the tenant tables with a clean TABLE-permission error (not a function error)", async () => {
    for (const tbl of ["organizations", "org_memberships", "audit_log"]) {
      await expect(acting(db, { role: "anon" }, () => db.query(`SELECT * FROM ${tbl}`))).rejects.toThrow(
        new RegExp(`permission denied for table ${tbl}`, "i"),
      );
    }
  });

  it("lets anon SELECT storage.objects for ANY bucket and get zero rows, with no helper-function error", async () => {
    // Seeded as superuser (bypasses RLS): one object in shop-documents, one in a
    // different (hypothetical future public) bucket. Before 0003 the shop_documents
    // policies applied to all roles, so an anon read of either raised
    // "permission denied for function is_active_org_member".
    await db.exec(`INSERT INTO storage.objects (bucket_id, name) VALUES ('shop-documents', '${ORG_A}/certs/cal.pdf')`);
    await db.exec(`INSERT INTO storage.objects (bucket_id, name) VALUES ('public-logos', 'brand/logo.png')`);

    const docs = await acting(db, { role: "anon" }, () => rows(`SELECT name FROM storage.objects WHERE bucket_id='shop-documents'`));
    expect(docs).toHaveLength(0);
    const other = await acting(db, { role: "anon" }, () => rows(`SELECT name FROM storage.objects WHERE bucket_id='public-logos'`));
    expect(other).toHaveLength(0);
  });

  it("still lets an authenticated member read their own Shop under the authenticated-scoped policies", async () => {
    const orgs = await acting(db, adminA, () => rows(`SELECT id FROM organizations`));
    expect(orgs.map((o) => o.id)).toEqual([ORG_A]);
    const mem = await acting(db, adminA, () => rows(`SELECT org_id FROM org_memberships`));
    expect(mem.length).toBeGreaterThan(0);
    expect(mem.every((m) => m.org_id === ORG_A)).toBe(true);
  });

  it("strips TRUNCATE / TRIGGER / REFERENCES from authenticated and service_role on the app tables", async () => {
    for (const tbl of ["organizations", "org_memberships", "audit_log"]) {
      for (const role of ["authenticated", "service_role"]) {
        const r = await one(
          `SELECT has_table_privilege('${role}', '${tbl}', 'TRUNCATE') AS trunc,
                  has_table_privilege('${role}', '${tbl}', 'TRIGGER') AS trig,
                  has_table_privilege('${role}', '${tbl}', 'REFERENCES') AS ref`,
        );
        expect(r.trunc, `${role} TRUNCATE on ${tbl}`).toBe(false);
        expect(r.trig, `${role} TRIGGER on ${tbl}`).toBe(false);
        expect(r.ref, `${role} REFERENCES on ${tbl}`).toBe(false);
      }
    }
  });
});

describe("Audit reason write path & no-op UPDATE skip (0003, findings 2 & 8)", () => {
  beforeEach(async () => {
    await seedTwoShops(db);
  });

  it("stores a reason passed through update_org_settings, with the trusted actor", async () => {
    await acting(db, adminA, () =>
      db.query(`SELECT update_org_settings('${ORG_A}','America/New_York','TL',90,1,6,0,30,30,30,'Aligning with insurer')`),
    );
    const audit = await one(
      `SELECT reason, actor_user_id, actor_email, actor_name FROM audit_log
       WHERE table_name='organizations' AND action='UPDATE' AND org_id='${ORG_A}' ORDER BY created_at DESC LIMIT 1`,
    );
    expect(audit.reason).toBe("Aligning with insurer");
    expect(audit.actor_user_id).toBe(A_ADMIN_USER);
    expect(audit.actor_email).toBe("admin.a@apexchartermx.example");
    expect(audit.actor_name).toBe("Admin A");
  });

  it("stores a reason passed through update_member_role_designations", async () => {
    await acting(db, adminA, () =>
      db.query(`SELECT update_member_role_designations('${A_MECH_MEMBER}','inspector',false,false,'Cross-trained on inspections')`),
    );
    const audit = await one(
      `SELECT reason, after_data->>'role' AS role FROM audit_log
       WHERE table_name='org_memberships' AND action='UPDATE' AND record_id='${A_MECH_MEMBER}' ORDER BY created_at DESC LIMIT 1`,
    );
    expect(audit.reason).toBe("Cross-trained on inspections");
    expect(audit.role).toBe("inspector");
  });

  it("stores a reason passed through deactivate_member", async () => {
    await acting(db, adminA, () => db.query(`SELECT deactivate_member('${A_MECH_MEMBER}','Left the company')`));
    const audit = await one(
      `SELECT reason, after_data->>'status' AS status FROM audit_log
       WHERE table_name='org_memberships' AND action='UPDATE' AND record_id='${A_MECH_MEMBER}' ORDER BY created_at DESC LIMIT 1`,
    );
    expect(audit.reason).toBe("Left the company");
    expect(audit.status).toBe("deactivated");
  });

  it("deactivate_member requires a non-empty reason", async () => {
    await expect(acting(db, adminA, () => db.query(`SELECT deactivate_member('${A_MECH_MEMBER}','   ')`))).rejects.toThrow(
      /REASON_REQUIRED/,
    );
  });

  it("reads a reason set via set_config in the SAME transaction, but never leaks it to a later one", async () => {
    // Same transaction: the reason reaches the capture trigger.
    await acting(db, adminA, () =>
      db.exec(`
        BEGIN;
        SELECT set_config('hangar.audit_reason', 'Same-txn reason', true);
        UPDATE organizations SET due_soon_days = 55 WHERE id = '${ORG_A}';
        COMMIT;
      `),
    );
    const sameTxn = await one(
      `SELECT reason FROM audit_log WHERE table_name='organizations' AND action='UPDATE'
       AND after_data->>'due_soon_days'='55' ORDER BY created_at DESC LIMIT 1`,
    );
    expect(sameTxn.reason).toBe("Same-txn reason");

    // Different transaction: set_config(..., is_local := true) in one autocommit
    // statement does not survive into the next statement's transaction.
    await acting(db, adminA, async () => {
      await db.query(`SELECT set_config('hangar.audit_reason', 'Should not leak', true)`);
      await db.query(`UPDATE organizations SET due_soon_days = 66 WHERE id = '${ORG_A}'`);
    });
    const laterTxn = await one(
      `SELECT reason FROM audit_log WHERE table_name='organizations' AND action='UPDATE'
       AND after_data->>'due_soon_days'='66' ORDER BY created_at DESC LIMIT 1`,
    );
    expect(laterTxn.reason).toBeNull();
  });

  it("resolves the actor from the JWT only — a hangar.* setting cannot forge it", async () => {
    await acting(db, adminA, () =>
      db.exec(`
        BEGIN;
        SELECT set_config('hangar.actor_email', 'attacker@evil.example', true);
        SELECT set_config('hangar.audit_reason', 'Legit reason', true);
        UPDATE org_memberships SET role='inspector' WHERE id='${A_MECH_MEMBER}';
        COMMIT;
      `),
    );
    const audit = await one(
      `SELECT actor_email, actor_user_id, reason FROM audit_log
       WHERE table_name='org_memberships' AND action='UPDATE' AND record_id='${A_MECH_MEMBER}' ORDER BY created_at DESC LIMIT 1`,
    );
    expect(audit.actor_email).toBe("admin.a@apexchartermx.example");
    expect(audit.actor_user_id).toBe(A_ADMIN_USER);
    expect(audit.reason).toBe("Legit reason");
  });

  it("still blocks a cross-Shop write through the invoker RPC (RLS applies as the caller)", async () => {
    await expect(
      acting(db, adminB, () =>
        db.query(`SELECT update_org_settings('${ORG_A}','America/New_York','TL',90,1,6,0,30,30,30,'nope')`),
      ),
    ).rejects.toThrow(/ORG_NOT_FOUND|no organization/i);
    const org = await one(`SELECT timezone FROM organizations WHERE id='${ORG_A}'`);
    expect(org.timezone).toBe("America/Los_Angeles"); // unchanged
  });

  it("records NO audit row for a no-op UPDATE (WHEN OLD.* IS DISTINCT FROM NEW.*)", async () => {
    const before = await one(`SELECT count(*)::int AS n FROM audit_log WHERE org_id='${ORG_A}'`);
    // Owner context (bypasses RLS) isolates the trigger WHEN guard; the value is
    // set to itself so the row is unchanged and updated_at is not touched.
    const res = await db.query(`UPDATE organizations SET due_soon_days = due_soon_days WHERE id='${ORG_A}'`);
    expect(res.affectedRows).toBe(1); // the row was visited...
    const after = await one(`SELECT count(*)::int AS n FROM audit_log WHERE org_id='${ORG_A}'`);
    expect(after.n).toBe(before.n); // ...but nothing changed, so no audit row
  });

  it("still records an audit row for a real UPDATE", async () => {
    const before = await one(`SELECT count(*)::int AS n FROM audit_log WHERE org_id='${ORG_A}'`);
    await db.exec(`UPDATE organizations SET due_soon_days = 123 WHERE id='${ORG_A}'`);
    const after = await one(`SELECT count(*)::int AS n FROM audit_log WHERE org_id='${ORG_A}'`);
    expect(after.n).toBe((before.n as number) + 1);
  });

  it("update_org_settings with the current values writes NO audit row and leaves updated_at unchanged (finding 1)", async () => {
    const cur = await one(
      `SELECT timezone, tool_id_prefix, due_soon_days, weekly_digest_day, weekly_digest_hour,
              weekly_digest_minute, missing_tool_threshold_days, stale_aircraft_days,
              idle_timeout_minutes, updated_at
       FROM organizations WHERE id='${ORG_A}'`,
    );
    const before = await one(`SELECT count(*)::int AS n FROM audit_log WHERE org_id='${ORG_A}'`);

    // No-op: every parameter equals the stored value, so the RPC must not bump
    // updated_at and the capture trigger must record nothing — even though a
    // reason is supplied and the UI guard is bypassed (direct API / double submit).
    await acting(db, adminA, () =>
      db.query(`SELECT update_org_settings($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [
        ORG_A,
        cur.timezone,
        cur.tool_id_prefix,
        cur.due_soon_days,
        cur.weekly_digest_day,
        cur.weekly_digest_hour,
        cur.weekly_digest_minute,
        cur.missing_tool_threshold_days,
        cur.stale_aircraft_days,
        cur.idle_timeout_minutes,
        "no-op must not be logged",
      ]),
    );
    const afterNoop = await one(`SELECT count(*)::int AS n FROM audit_log WHERE org_id='${ORG_A}'`);
    const postNoop = await one(`SELECT updated_at FROM organizations WHERE id='${ORG_A}'`);
    expect(afterNoop.n).toBe(before.n);
    expect(postNoop.updated_at).toEqual(cur.updated_at);

    // A single real change writes exactly one audit row and bumps updated_at.
    const newDue = Number(cur.due_soon_days) === 200 ? 201 : 200;
    await acting(db, adminA, () =>
      db.query(`SELECT update_org_settings($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [
        ORG_A,
        cur.timezone,
        cur.tool_id_prefix,
        newDue,
        cur.weekly_digest_day,
        cur.weekly_digest_hour,
        cur.weekly_digest_minute,
        cur.missing_tool_threshold_days,
        cur.stale_aircraft_days,
        cur.idle_timeout_minutes,
        "real change",
      ]),
    );
    const afterReal = await one(`SELECT count(*)::int AS n FROM audit_log WHERE org_id='${ORG_A}'`);
    const postReal = await one(`SELECT updated_at FROM organizations WHERE id='${ORG_A}'`);
    expect(afterReal.n).toBe((before.n as number) + 1);
    expect(postReal.updated_at).not.toEqual(cur.updated_at);
  });

  it("update_member_role_designations with the current values writes NO audit row and leaves updated_at unchanged (finding 1)", async () => {
    const cur = await one(
      `SELECT role, is_cal_designee, is_designated_auditor, updated_at
       FROM org_memberships WHERE id='${A_MECH_MEMBER}'`,
    );
    const before = await one(
      `SELECT count(*)::int AS n FROM audit_log WHERE table_name='org_memberships' AND record_id='${A_MECH_MEMBER}'`,
    );

    await acting(db, adminA, () =>
      db.query(`SELECT update_member_role_designations($1,$2,$3,$4,$5)`, [
        A_MECH_MEMBER,
        cur.role,
        cur.is_cal_designee,
        cur.is_designated_auditor,
        "no-op must not be logged",
      ]),
    );
    const afterNoop = await one(
      `SELECT count(*)::int AS n FROM audit_log WHERE table_name='org_memberships' AND record_id='${A_MECH_MEMBER}'`,
    );
    const postNoop = await one(`SELECT updated_at FROM org_memberships WHERE id='${A_MECH_MEMBER}'`);
    expect(afterNoop.n).toBe(before.n);
    expect(postNoop.updated_at).toEqual(cur.updated_at);

    await acting(db, adminA, () =>
      db.query(`SELECT update_member_role_designations($1,$2,$3,$4,$5)`, [
        A_MECH_MEMBER,
        "inspector",
        cur.is_cal_designee,
        cur.is_designated_auditor,
        "real change",
      ]),
    );
    const afterReal = await one(
      `SELECT count(*)::int AS n FROM audit_log WHERE table_name='org_memberships' AND record_id='${A_MECH_MEMBER}'`,
    );
    const postReal = await one(`SELECT updated_at FROM org_memberships WHERE id='${A_MECH_MEMBER}'`);
    expect(afterReal.n).toBe((before.n as number) + 1);
    expect(postReal.updated_at).not.toEqual(cur.updated_at);
  });

  it("re-running deactivate_member on an already-deactivated member with the same reason writes NO audit row and leaves updated_at unchanged (finding 1)", async () => {
    // First deactivation is the real change (one audit row).
    await acting(db, adminA, () => db.query(`SELECT deactivate_member('${A_MECH_MEMBER}','Left the company')`));
    const afterFirst = await one(
      `SELECT count(*)::int AS n FROM audit_log WHERE table_name='org_memberships' AND record_id='${A_MECH_MEMBER}'`,
    );
    const firstRow = await one(`SELECT updated_at FROM org_memberships WHERE id='${A_MECH_MEMBER}'`);

    // Re-deactivating with the same reason is a no-op: no new audit row, updated_at untouched.
    await acting(db, adminA, () => db.query(`SELECT deactivate_member('${A_MECH_MEMBER}','Left the company')`));
    const afterSecond = await one(
      `SELECT count(*)::int AS n FROM audit_log WHERE table_name='org_memberships' AND record_id='${A_MECH_MEMBER}'`,
    );
    const secondRow = await one(`SELECT updated_at FROM org_memberships WHERE id='${A_MECH_MEMBER}'`);
    expect(afterSecond.n).toBe(afterFirst.n);
    expect(secondRow.updated_at).toEqual(firstRow.updated_at);

    // Re-deactivating with a different reason is a real change (one more audit row).
    await acting(db, adminA, () => db.query(`SELECT deactivate_member('${A_MECH_MEMBER}','Updated: transferred to another shop')`));
    const afterThird = await one(
      `SELECT count(*)::int AS n FROM audit_log WHERE table_name='org_memberships' AND record_id='${A_MECH_MEMBER}'`,
    );
    expect(afterThird.n).toBe((afterSecond.n as number) + 1);
  });

  it("grants EXECUTE on the write RPCs to authenticated only (anon + service_role denied)", async () => {
    const fns = [
      "update_member_role_designations(uuid, text, boolean, boolean, text)",
      "deactivate_member(uuid, text)",
      "update_org_settings(uuid, text, text, integer, integer, integer, integer, integer, integer, integer, text)",
    ];
    for (const fn of fns) {
      const r = await one(
        `SELECT has_function_privilege('authenticated', '${fn}', 'EXECUTE') AS authed,
                has_function_privilege('anon', '${fn}', 'EXECUTE') AS anon,
                has_function_privilege('service_role', '${fn}', 'EXECUTE') AS svc`,
      );
      expect(r.authed, `authenticated EXECUTE on ${fn}`).toBe(true);
      expect(r.anon, `anon EXECUTE on ${fn}`).toBe(false);
      expect(r.svc, `service_role EXECUTE on ${fn}`).toBe(false);
    }
  });
});
