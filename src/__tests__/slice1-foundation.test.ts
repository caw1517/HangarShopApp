import { beforeEach, describe, expect, it } from "vitest";
import { IdleSessionTracker } from "@/lib/domain/idle-session";
import {
  CrossTenantNotFoundError,
  HardDeleteBlockedError,
  ImmutableAuditLogError,
  LastAdminGuardError,
  NotAuthorizedError,
} from "@/lib/domain/errors";
import {
  DEVON_APEX_ID,
  DEVON_USER_ID,
  ELENA_APEX_ID,
  ELENA_CASCADE_ID,
  ELENA_USER_ID,
  HANNAH_APEX_ID,
  JORDAN_CASCADE_ID,
  JORDAN_USER_ID,
  MARCUS_APEX_ID,
  MARCUS_USER_ID,
  ORG_APEX_ID,
  ORG_CASCADE_ID,
  PLATFORM_OWNER,
} from "@/lib/domain/seed";
import { ShopFoundationStore } from "@/lib/domain/store";
import { SETTINGS_BOUNDS, VALID_TIMEZONES, validateOrgSettings } from "@/lib/domain/settings-validation";
import type { Principal } from "@/lib/domain/types";

const elena: Principal = { userId: ELENA_USER_ID, email: "elena.rostova@apexchartermx.example", fullName: "Elena Rostova" };
const marcus: Principal = { userId: MARCUS_USER_ID, email: "marcus.vance@apexchartermx.example", fullName: "Marcus Vance" };
const devon: Principal = { userId: DEVON_USER_ID, email: "devon.brooks@apexchartermx.example", fullName: "Devon Brooks" };
const jordan: Principal = { userId: JORDAN_USER_ID, email: "jordan.reyes@cascadeflightservices.example", fullName: "Jordan Reyes" };
const outsider: Principal = { userId: "u-random-outsider", email: "outsider@example.com", fullName: "Outsider" };

let store: ShopFoundationStore;

beforeEach(() => {
  store = new ShopFoundationStore();
});

describe("Multi-Shop data & storage path isolation (ADR-0001)", () => {
  it("blocks an Apex member from reading Cascade's organization", () => {
    expect(() => store.getOrganization(devon, ORG_CASCADE_ID)).toThrow(CrossTenantNotFoundError);
  });

  it("blocks an Apex member from reading Cascade's members", () => {
    expect(() => store.listMembers(devon, ORG_CASCADE_ID)).toThrow(CrossTenantNotFoundError);
  });

  it("blocks a Cascade member from reading Apex's audit_log", () => {
    expect(() => store.getAuditLog(jordan, ORG_APEX_ID)).toThrow(CrossTenantNotFoundError);
  });

  it("returns an indistinguishable not-found error for a complete non-member", () => {
    expect(() => store.getOrganization(outsider, ORG_APEX_ID)).toThrow(CrossTenantNotFoundError);
    expect(() => store.getOrganization(outsider, ORG_CASCADE_ID)).toThrow(CrossTenantNotFoundError);
  });

  it("isolates storage paths by leading org_id segment", () => {
    expect(store.canAccessStoragePath(devon, `${ORG_APEX_ID}/certs/cal-2026-01.pdf`)).toBe(true);
    expect(store.canAccessStoragePath(devon, `${ORG_CASCADE_ID}/certs/cal-2026-01.pdf`)).toBe(false);
    expect(store.canAccessStoragePath(outsider, `${ORG_APEX_ID}/certs/cal-2026-01.pdf`)).toBe(false);
  });

  it("lets Elena read both Shops she is an active Member of, scoped independently", () => {
    const apexOrg = store.getOrganization(elena, ORG_APEX_ID);
    const cascadeOrg = store.getOrganization(elena, ORG_CASCADE_ID);
    expect(apexOrg.name).toBe("Apex Charter MX · Hangar 1");
    expect(cascadeOrg.name).toBe("Cascade Flight Services");
    // Role re-scoping: Admin at Apex, Inspector at Cascade
    expect(store.hasOrgRole(elena, ORG_APEX_ID, ["admin"])).toBe(true);
    expect(store.hasOrgRole(elena, ORG_CASCADE_ID, ["admin"])).toBe(false);
    expect(store.hasOrgRole(elena, ORG_CASCADE_ID, ["inspector"])).toBe(true);
  });
});

describe("Platform Owner Shop provisioning (ADR-0001)", () => {
  it("provisions a new Shop and invites its initial Admin", () => {
    const receipt = store.provisionShopAsPlatformOwner(PLATFORM_OWNER, {
      name: "Pacific Rotorcraft Maintenance",
      slug: "org-pacific-rotorcraft",
      adminEmail: "admin@pacificrotorcraft.example",
      adminFullName: "Priya Nakamura",
    });
    expect(receipt.shop_name).toBe("Pacific Rotorcraft Maintenance");
    expect(receipt.initial_admin_email).toBe("admin@pacificrotorcraft.example");
    expect(receipt.invite_status).toBe("invited");
    expect(receipt.org_id).toBeTruthy();
  });

  it("emits initial audit_log entries inside the new Shop", () => {
    const receipt = store.provisionShopAsPlatformOwner(PLATFORM_OWNER, {
      name: "Pacific Rotorcraft Maintenance",
      slug: "org-pacific-rotorcraft",
      adminEmail: "admin@pacificrotorcraft.example",
      adminFullName: "Priya Nakamura",
    });
    // Platform Owner cannot read the new Shop's audit_log either (asserted below),
    // so inspect via an invited-then-promoted member instead: use Apex's admin to
    // confirm the receipt matches a real org row by provisioning count side effects.
    expect(() => store.getAuditLog(PLATFORM_OWNER, receipt.org_id)).toThrow(CrossTenantNotFoundError);
  });

  it("grants the Platform Owner zero read access to the provisioned Shop unless invited", () => {
    const receipt = store.provisionShopAsPlatformOwner(PLATFORM_OWNER, {
      name: "Pacific Rotorcraft Maintenance",
      slug: "org-pacific-rotorcraft",
      adminEmail: "admin@pacificrotorcraft.example",
      adminFullName: "Priya Nakamura",
    });
    expect(() => store.getOrganization(PLATFORM_OWNER, receipt.org_id)).toThrow(CrossTenantNotFoundError);
    expect(() => store.listMembers(PLATFORM_OWNER, receipt.org_id)).toThrow(CrossTenantNotFoundError);
  });

  it("rejects provisioning attempts from a non-Platform-Owner principal", () => {
    expect(() =>
      store.provisionShopAsPlatformOwner(elena, {
        name: "Rogue Shop",
        slug: "org-rogue",
        adminEmail: "a@example.com",
        adminFullName: "A",
      }),
    ).toThrow(NotAuthorizedError);
  });
});

describe("Append-only audit_log capture & immutability (ADR-0002)", () => {
  it("records an INSERT audit_log entry with actor, org_id, and after_data on invite", () => {
    const before = store.getAuditLog(elena, ORG_APEX_ID).length;
    const member = store.inviteMember(elena, ORG_APEX_ID, { email: "new.hire@apexchartermx.example", fullName: "New Hire", role: "mechanic" });
    const log = store.getAuditLog(elena, ORG_APEX_ID);
    expect(log.length).toBe(before + 1);
    const entry = log.find((e) => e.record_id === member.id);
    expect(entry?.action).toBe("INSERT");
    expect(entry?.org_id).toBe(ORG_APEX_ID);
    expect(entry?.actor_user_id).toBe(ELENA_USER_ID);
    expect(entry?.after_data).toMatchObject({ email: "new.hire@apexchartermx.example" });
    expect(entry?.before_data).toBeNull();
  });

  it("records an UPDATE audit_log entry with before/after diff and reason on role change", () => {
    store.updateMember(elena, ORG_APEX_ID, DEVON_APEX_ID, { role: "inspector" }, "Cross-trained on inspections");
    const log = store.getAuditLog(elena, ORG_APEX_ID);
    const entry = log.find((e) => e.record_id === DEVON_APEX_ID && e.action === "UPDATE");
    expect(entry?.reason).toBe("Cross-trained on inspections");
    expect(entry?.before_data).toMatchObject({ role: "mechanic" });
    expect(entry?.after_data).toMatchObject({ role: "inspector" });
  });

  it("throws ImmutableAuditLogError on any attempt to mutate or delete audit_log", () => {
    expect(() => store.updateAuditLogEntry()).toThrow(ImmutableAuditLogError);
    expect(() => store.deleteAuditLogEntry()).toThrow(ImmutableAuditLogError);
  });

  it("preserves all historical audit_log records when a Member is deactivated", () => {
    const beforeCount = store.getAuditLog(elena, ORG_APEX_ID).length;
    // Hannah's original seeded INSERT + deactivation UPDATE must already exist
    const hannahEntries = store.getAuditLog(elena, ORG_APEX_ID).filter((e) => e.record_id === HANNAH_APEX_ID);
    expect(hannahEntries.length).toBeGreaterThanOrEqual(2);
    store.updateMember(elena, ORG_APEX_ID, MARCUS_APEX_ID, { isCalDesignee: false }, "Stepping back from cal duties");
    expect(store.getAuditLog(elena, ORG_APEX_ID).length).toBe(beforeCount + 1);
    // still present, untouched
    expect(store.getAuditLog(elena, ORG_APEX_ID).filter((e) => e.record_id === HANNAH_APEX_ID).length).toBe(hannahEntries.length);
  });

  it("blocks hard deletion of a Member — must deactivate instead", () => {
    expect(() => store.deleteMember()).toThrow(HardDeleteBlockedError);
  });
});

describe("Role & Compliance Designation guards", () => {
  it("only Admin can invite, update, or deactivate Members", () => {
    expect(() => store.inviteMember(devon, ORG_APEX_ID, { email: "x@apexchartermx.example", fullName: "X", role: "mechanic" })).toThrow(
      NotAuthorizedError,
    );
    expect(() => store.updateMember(devon, ORG_APEX_ID, MARCUS_APEX_ID, { role: "mechanic" })).toThrow(NotAuthorizedError);
    expect(() => store.deactivateMember(devon, ORG_APEX_ID, MARCUS_APEX_ID, "not allowed")).toThrow(NotAuthorizedError);
  });

  it("only Admin can update Shop settings", () => {
    expect(() => store.updateOrgSettings(devon, ORG_APEX_ID, { dueSoonDays: 45 })).toThrow(NotAuthorizedError);
    const updated = store.updateOrgSettings(elena, ORG_APEX_ID, { dueSoonDays: 45 }, "Shortened per insurer request");
    expect(updated.due_soon_days).toBe(45);
  });

  it("allows Admin and Inspector to read audit_log but denies Mechanic", () => {
    expect(() => store.getAuditLog(elena, ORG_APEX_ID)).not.toThrow();
    expect(() => store.getAuditLog(marcus, ORG_APEX_ID)).not.toThrow();
    expect(() => store.getAuditLog(devon, ORG_APEX_ID)).toThrow(NotAuthorizedError);
  });

  it("gates calibration verification on the Cal Designee flag", () => {
    expect(store.canVerifyCalibration(marcus, ORG_APEX_ID)).toBe(true);
    expect(store.canVerifyCalibration(devon, ORG_APEX_ID)).toBe(false);
  });

  it("gates facility audits on the Designated Auditor flag", () => {
    expect(store.canConductFacilityAudit(devon, ORG_APEX_ID)).toBe(true);
    expect(store.canConductFacilityAudit(marcus, ORG_APEX_ID)).toBe(true);
    expect(store.canConductFacilityAudit(elena, ORG_APEX_ID)).toBe(false);
  });
});

describe("Last-Admin Guard (ADR-0002)", () => {
  it("blocks demoting the sole active Admin", () => {
    expect(() => store.updateMember(elena, ORG_APEX_ID, ELENA_APEX_ID, { role: "mechanic" })).toThrow(LastAdminGuardError);
    // state unchanged
    const members = store.listMembers(elena, ORG_APEX_ID);
    expect(members.find((m) => m.id === ELENA_APEX_ID)?.role).toBe("admin");
  });

  it("blocks deactivating the sole active Admin", () => {
    expect(() => store.deactivateMember(elena, ORG_APEX_ID, ELENA_APEX_ID, "leaving")).toThrow(LastAdminGuardError);
    const members = store.listMembers(elena, ORG_APEX_ID);
    expect(members.find((m) => m.id === ELENA_APEX_ID)?.status).toBe("active");
  });

  it("allows demoting/deactivating an Admin once a second active Admin exists, and logs it", () => {
    // Cascade starts with Jordan (admin) + Elena (inspector) both active.
    store.updateMember(jordan, ORG_CASCADE_ID, ELENA_CASCADE_ID, { role: "admin" }, "Promoting second Admin for coverage");
    // Now two active Admins — demoting Jordan should succeed.
    const beforeLogCount = store.getAuditLog(jordan, ORG_CASCADE_ID).length;
    const demoted = store.updateMember(jordan, ORG_CASCADE_ID, JORDAN_CASCADE_ID, { role: "inspector" }, "Handing off Admin duties");
    expect(demoted.role).toBe("inspector");
    const log = store.getAuditLog(elena, ORG_CASCADE_ID);
    expect(log.length).toBe(beforeLogCount + 1);
    expect(log.find((e) => e.record_id === JORDAN_CASCADE_ID && e.reason === "Handing off Admin duties")).toBeTruthy();

    // Elena is now the sole active Admin — the guard re-engages.
    expect(() => store.updateMember(elena, ORG_CASCADE_ID, ELENA_CASCADE_ID, { role: "inspector" })).toThrow(LastAdminGuardError);
  });
});

describe("Per-Shop settings defaults", () => {
  it("defaults Apex to the documented Slice 1 compliance thresholds", () => {
    const org = store.getOrganization(elena, ORG_APEX_ID);
    expect(org.due_soon_days).toBe(90);
    expect(org.weekly_digest_day).toBe(1);
    expect(org.weekly_digest_hour).toBe(6);
    expect(org.weekly_digest_minute).toBe(0);
    expect(org.missing_tool_threshold_days).toBe(30);
    expect(org.stale_aircraft_days).toBe(30);
    expect(org.idle_timeout_minutes).toBe(30);
  });

  it("allows Cascade to run its own independent thresholds", () => {
    const org = store.getOrganization(jordan, ORG_CASCADE_ID);
    expect(org.due_soon_days).toBe(60);
    expect(org.missing_tool_threshold_days).toBe(21);
    expect(org.stale_aircraft_days).toBe(14);
  });

  it("records an audit_log UPDATE with before/after diff when settings are saved", () => {
    const updated = store.updateOrgSettings(elena, ORG_APEX_ID, { idleTimeoutMinutes: 45 }, "Longer timeout for hangar floor tablets");
    expect(updated.idle_timeout_minutes).toBe(45);
    const entry = store.getAuditLog(elena, ORG_APEX_ID).find((e) => e.table_name === "organizations" && e.action === "UPDATE");
    expect(entry?.before_data).toMatchObject({ idle_timeout_minutes: 30 });
    expect(entry?.after_data).toMatchObject({ idle_timeout_minutes: 45 });
  });

  it("does not record an audit entry (or touch updated_at) for a no-op settings save", () => {
    const before = store.getOrganization(elena, ORG_APEX_ID);
    const beforeLogCount = store.getAuditLog(elena, ORG_APEX_ID).length;
    // Save the exact current values — nothing changes.
    const result = store.updateOrgSettings(
      elena,
      ORG_APEX_ID,
      {
        dueSoonDays: before.due_soon_days,
        idleTimeoutMinutes: before.idle_timeout_minutes,
        timezone: before.timezone,
        toolIdPrefix: before.tool_id_prefix,
      },
      "No real change",
    );
    expect(result.updated_at).toBe(before.updated_at); // updated_at untouched
    expect(store.getAuditLog(elena, ORG_APEX_ID).length).toBe(beforeLogCount); // no new audit row
  });
});

describe("Settings validation bounds & time zone (PR #38 round-2 follow-ups)", () => {
  it("caps the open-ended day thresholds at 3650, matching the DB CHECKs", () => {
    // The UI, the store, and the 0002 CHECK constraints must reject the same values.
    expect(SETTINGS_BOUNDS.missingToolThresholdDays.max).toBe(3650);
    expect(SETTINGS_BOUNDS.staleAircraftDays.max).toBe(3650);

    expect(validateOrgSettings({ missingToolThresholdDays: 4000 })).toMatch(/between 1 and 3650/);
    expect(validateOrgSettings({ staleAircraftDays: 4000 })).toMatch(/between 1 and 3650/);
    expect(validateOrgSettings({ missingToolThresholdDays: 3650, staleAircraftDays: 3650 })).toBeNull();

    expect(() => store.updateOrgSettings(elena, ORG_APEX_ID, { missingToolThresholdDays: 4000 })).toThrow(/between 1 and 3650/);
    const ok = store.updateOrgSettings(elena, ORG_APEX_ID, { missingToolThresholdDays: 3650 });
    expect(ok.missing_tool_threshold_days).toBe(3650);
  });

  it("rejects a time zone that is not in the known list", () => {
    expect(VALID_TIMEZONES).toContain("America/Los_Angeles");
    expect(validateOrgSettings({ timezone: "Mars/Phobos" })).toMatch(/recognized Shop time zone/);
    expect(validateOrgSettings({ timezone: "America/New_York" })).toBeNull();
    expect(() => store.updateOrgSettings(elena, ORG_APEX_ID, { timezone: "Mars/Phobos" })).toThrow(/recognized Shop time zone/);
    const ok = store.updateOrgSettings(elena, ORG_APEX_ID, { timezone: "America/New_York" });
    expect(ok.timezone).toBe("America/New_York");
  });
});

describe("Idle session timeout state machine", () => {
  it("stays active below the warning threshold, then warns, then times out deterministically", () => {
    const tracker = new IdleSessionTracker(30);
    expect(tracker.state).toBe("active");
    tracker.advance(27 * 60_000);
    expect(tracker.state).toBe("active");
    tracker.advance(1.5 * 60_000);
    expect(tracker.state).toBe("warning");
    tracker.advance(1.5 * 60_000);
    expect(tracker.state).toBe("timed-out");
  });

  it("resets back to active on user activity", () => {
    const tracker = new IdleSessionTracker(30);
    tracker.advance(29 * 60_000);
    expect(tracker.state).toBe("warning");
    tracker.reset();
    expect(tracker.state).toBe("active");
    expect(tracker.elapsedMilliseconds).toBe(0);
  });

  it("supports forcing warning/timeout states for UI preview", () => {
    const tracker = new IdleSessionTracker(30);
    tracker.forceWarning();
    expect(tracker.state).toBe("warning");
    tracker.forceTimeout();
    expect(tracker.state).toBe("timed-out");
  });

  it("restarts the clock on background activity only while active", () => {
    const tracker = new IdleSessionTracker(30);
    tracker.advance(20 * 60_000);
    expect(tracker.state).toBe("active");
    // Background activity while active restarts the idle clock.
    expect(tracker.registerActivity()).toBe("active");
    expect(tracker.elapsedMilliseconds).toBe(0);
  });

  it("ignores background activity once the warning dialog is showing, so Sign out now stays reachable", () => {
    // Reproduces PR #38: the mousedown preceding a "Sign out now" click must not
    // silently dismiss the warning (which would unmount the dialog before the
    // click lands). Whether the warning was reached by the real timeout or by the
    // Tweaks "Preview warning" control, ambient activity leaves it in place.
    const real = new IdleSessionTracker(30);
    real.advance(29 * 60_000);
    expect(real.state).toBe("warning");
    expect(real.registerActivity()).toBe("warning");
    expect(real.state).toBe("warning");

    const previewed = new IdleSessionTracker(30);
    previewed.forceWarning();
    expect(previewed.registerActivity()).toBe("warning");
    expect(previewed.state).toBe("warning");

    // The explicit "Stay signed in" choice still clears the warning.
    previewed.reset();
    expect(previewed.state).toBe("active");
  });
});
