import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
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

let db: PGlite;

async function rows(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
  const res = await db.query<Record<string, unknown>>(sql, params);
  return res.rows;
}

async function one(sql: string, params: unknown[] = []): Promise<Record<string, unknown>> {
  const r = await rows(sql, params);
  if (r.length === 0) throw new Error(`expected at least one row for: ${sql}`);
  return r[0]!;
}

beforeEach(async () => {
  db = await createTestDb();
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

  it("authorizes the platform-owner check only for a registered owner (defense-in-depth path)", async () => {
    const ownerUid = "d0000001-0000-4000-8000-000000000001";
    const notOwnerUid = "d0000002-0000-4000-8000-000000000002";

    const beforeRegistration = await acting(db, member(ownerUid, "o@x.example", "Owner"), () =>
      rows(`SELECT is_platform_owner() AS ok`),
    );
    expect(beforeRegistration[0]!.ok).toBe(false);

    await db.query(`INSERT INTO platform_owners (user_id) VALUES ($1)`, [ownerUid]);

    const afterRegistration = await acting(db, member(ownerUid, "o@x.example", "Owner"), () =>
      rows(`SELECT is_platform_owner() AS ok`),
    );
    expect(afterRegistration[0]!.ok).toBe(true);

    const nonOwner = await acting(db, member(notOwnerUid, "n@x.example", "Non Owner"), () =>
      rows(`SELECT is_platform_owner() AS ok`),
    );
    expect(nonOwner[0]!.ok).toBe(false);

    const anon = await acting(db, { role: "anon" }, () => rows(`SELECT is_platform_owner() AS ok`));
    expect(anon[0]!.ok).toBe(false);
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
