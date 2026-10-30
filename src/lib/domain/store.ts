import { deepFreezeClone } from "./clone";
import {
  CrossTenantNotFoundError,
  HardDeleteBlockedError,
  ImmutableAuditLogError,
  LastAdminGuardError,
  NotAuthorizedError,
} from "./errors";
import { seedAuditLog, seedMemberships, seedOrganizations } from "./seed";
import { validateOrgSettings } from "./settings-validation";
import type {
  AuditAction,
  AuditLogEntry,
  InviteMemberInput,
  Organization,
  OrgMembership,
  Principal,
  ProvisionShopInput,
  ProvisionShopReceipt,
  Role,
  UpdateMemberInput,
  UpdateOrgSettingsInput,
} from "./types";

export interface ShopFoundationStoreOptions {
  organizations?: Organization[];
  memberships?: OrgMembership[];
  auditLog?: AuditLogEntry[];
  now?: () => string;
  idGen?: () => string;
}

const ADMIN_ONLY: Role[] = ["admin"];
const AUDIT_LOG_READERS: Role[] = ["admin", "inspector"];

/**
 * Deterministic in-memory domain engine enforcing the same tenant-isolation,
 * append-only-audit, and last-admin-guard invariants as the Postgres migration
 * (0001_slice1_multi_shop_foundation_and_audit_log.sql), so the app, Vitest
 * suite, and Playwright screenshots all run without a live Supabase instance.
 */
export class ShopFoundationStore {
  private organizations: Organization[];
  private memberships: OrgMembership[];
  private auditLog: AuditLogEntry[];
  private readonly now: () => string;
  private readonly idGen: () => string;

  constructor(options: ShopFoundationStoreOptions = {}) {
    this.organizations = options.organizations ?? seedOrganizations();
    this.memberships = options.memberships ?? seedMemberships();
    this.auditLog = options.auditLog ?? seedAuditLog();
    this.now = options.now ?? (() => new Date().toISOString());
    this.idGen = options.idGen ?? (() => crypto.randomUUID());
  }

  // ---------------------------------------------------------------------
  // Permission helpers (ADR-0001 RLS equivalents)
  // ---------------------------------------------------------------------

  private findMembership(principal: Principal, orgId: string): OrgMembership | undefined {
    return this.memberships.find((m) => m.org_id === orgId && m.user_id === principal.userId);
  }

  isActiveMember(principal: Principal, orgId: string): boolean {
    const membership = this.findMembership(principal, orgId);
    return !!membership && membership.status === "active";
  }

  hasOrgRole(principal: Principal, orgId: string, allowedRoles: Role[]): boolean {
    const membership = this.findMembership(principal, orgId);
    return !!membership && membership.status === "active" && allowedRoles.includes(membership.role);
  }

  canManageTeam(principal: Principal, orgId: string): boolean {
    return this.hasOrgRole(principal, orgId, ADMIN_ONLY);
  }

  canViewAuditLog(principal: Principal, orgId: string): boolean {
    return this.hasOrgRole(principal, orgId, AUDIT_LOG_READERS);
  }

  canConfigureShopSettings(principal: Principal, orgId: string): boolean {
    return this.hasOrgRole(principal, orgId, ADMIN_ONLY);
  }

  canVerifyCalibration(principal: Principal, orgId: string): boolean {
    const membership = this.findMembership(principal, orgId);
    return !!membership && membership.status === "active" && membership.is_cal_designee;
  }

  canConductFacilityAudit(principal: Principal, orgId: string): boolean {
    const membership = this.findMembership(principal, orgId);
    return !!membership && membership.status === "active" && membership.is_designated_auditor;
  }

  /** Storage path isolation check: first path segment must equal an org_id the caller is an active member of. */
  canAccessStoragePath(principal: Principal, path: string): boolean {
    const [orgId] = path.split("/");
    if (!orgId) return false;
    return this.isActiveMember(principal, orgId);
  }

  // ---------------------------------------------------------------------
  // Reads — cross-tenant lookups are indistinguishable "not found" (ADR-0001)
  // ---------------------------------------------------------------------

  getOrganization(principal: Principal, orgId: string): Organization {
    if (!this.isActiveMember(principal, orgId)) {
      throw new CrossTenantNotFoundError();
    }
    const org = this.organizations.find((o) => o.id === orgId);
    if (!org) throw new CrossTenantNotFoundError();
    return deepFreezeClone(org);
  }

  listMyOrganizations(principal: Principal): Organization[] {
    const activeOrgIds = new Set(
      this.memberships.filter((m) => m.user_id === principal.userId && m.status === "active").map((m) => m.org_id),
    );
    return deepFreezeClone(this.organizations.filter((o) => activeOrgIds.has(o.id)));
  }

  listMembers(principal: Principal, orgId: string): OrgMembership[] {
    if (!this.isActiveMember(principal, orgId)) {
      throw new CrossTenantNotFoundError();
    }
    return deepFreezeClone(this.memberships.filter((m) => m.org_id === orgId));
  }

  getAuditLog(principal: Principal, orgId: string): AuditLogEntry[] {
    if (!this.isActiveMember(principal, orgId)) {
      throw new CrossTenantNotFoundError();
    }
    if (!this.canViewAuditLog(principal, orgId)) {
      throw new NotAuthorizedError("NOT_AUTHORIZED: only Admin and Inspector roles can read audit_log");
    }
    return deepFreezeClone(
      this.auditLog.filter((a) => a.org_id === orgId).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    );
  }

  // ---------------------------------------------------------------------
  // Audit log append (ADR-0002) — the only way rows enter audit_log
  // ---------------------------------------------------------------------

  private appendAuditLog(
    orgId: string,
    actor: { userId: string | null; email: string | null; name: string | null },
    tableName: string,
    recordId: string,
    action: AuditAction,
    reason: string | null,
    before: Record<string, unknown> | null,
    after: Record<string, unknown> | null,
  ): void {
    const entry: AuditLogEntry = {
      id: this.idGen(),
      org_id: orgId,
      actor_user_id: actor.userId,
      actor_email: actor.email,
      actor_name: actor.name,
      table_name: tableName,
      record_id: recordId,
      action,
      reason,
      before_data: before ? JSON.parse(JSON.stringify(before)) : null,
      after_data: after ? JSON.parse(JSON.stringify(after)) : null,
      created_at: this.now(),
    };
    this.auditLog.push(entry);
  }

  /** Always throws — audit_log is append-only (ADR-0002, mirrors REVOKE UPDATE/DELETE + prevent_audit_log_mutation()). */
  updateAuditLogEntry(): never {
    throw new ImmutableAuditLogError();
  }

  /** Always throws — audit_log is append-only (ADR-0002). */
  deleteAuditLogEntry(): never {
    throw new ImmutableAuditLogError();
  }

  // ---------------------------------------------------------------------
  // Team & Roles management (Admin only) + Last-Admin Guard (ADR-0002)
  // ---------------------------------------------------------------------

  private requireAdmin(principal: Principal, orgId: string): OrgMembership {
    if (!this.isActiveMember(principal, orgId)) {
      throw new CrossTenantNotFoundError();
    }
    if (!this.canManageTeam(principal, orgId)) {
      throw new NotAuthorizedError("NOT_AUTHORIZED: only an active Admin can manage Members");
    }
    const actingMembership = this.findMembership(principal, orgId);
    if (!actingMembership) throw new CrossTenantNotFoundError();
    return actingMembership;
  }

  private activeAdminCountAfter(orgId: string, membershipId: string, patch: Partial<OrgMembership>): number {
    return this.memberships.filter((m) => {
      const effective = m.id === membershipId ? { ...m, ...patch } : m;
      return effective.org_id === orgId && effective.status === "active" && effective.role === "admin";
    }).length;
  }

  inviteMember(principal: Principal, orgId: string, input: InviteMemberInput, reason: string | null = null): OrgMembership {
    const actor = this.requireAdmin(principal, orgId);

    const existing = this.memberships.find(
      (m) => m.org_id === orgId && m.email.toLowerCase() === input.email.toLowerCase(),
    );
    if (existing) {
      throw new Error(`A member with email ${input.email} already exists in this Shop`);
    }

    const member: OrgMembership = {
      id: this.idGen(),
      org_id: orgId,
      user_id: null,
      email: input.email,
      full_name: input.fullName,
      role: input.role,
      is_cal_designee: input.isCalDesignee ?? false,
      is_designated_auditor: input.isDesignatedAuditor ?? false,
      status: "invited",
      certificate_type: input.certificateType ?? "N/A",
      certificate_number: input.certificateNumber ?? "N/A",
      invited_by: actor.user_id,
      deactivated_at: null,
      deactivation_reason: null,
      created_at: this.now(),
      updated_at: this.now(),
    };
    this.memberships.push(member);

    this.appendAuditLog(
      orgId,
      { userId: actor.user_id, email: actor.email, name: actor.full_name },
      "org_memberships",
      member.id,
      "INSERT",
      reason,
      null,
      member as unknown as Record<string, unknown>,
    );

    return deepFreezeClone(member);
  }

  updateMember(
    principal: Principal,
    orgId: string,
    memberId: string,
    input: UpdateMemberInput,
    reason: string | null = null,
  ): OrgMembership {
    const actor = this.requireAdmin(principal, orgId);

    const member = this.memberships.find((m) => m.id === memberId && m.org_id === orgId);
    if (!member) throw new CrossTenantNotFoundError();

    const patch: Partial<OrgMembership> = {};
    if (input.role !== undefined) patch.role = input.role;
    if (input.isCalDesignee !== undefined) patch.is_cal_designee = input.isCalDesignee;
    if (input.isDesignatedAuditor !== undefined) patch.is_designated_auditor = input.isDesignatedAuditor;
    if (input.certificateType !== undefined) patch.certificate_type = input.certificateType;
    if (input.certificateNumber !== undefined) patch.certificate_number = input.certificateNumber;

    if (input.role !== undefined && input.role !== "admin" && member.status === "active" && member.role === "admin") {
      if (this.activeAdminCountAfter(orgId, memberId, { role: input.role }) === 0) {
        throw new LastAdminGuardError();
      }
    }

    const before = { ...member };
    Object.assign(member, patch, { updated_at: this.now() });

    this.appendAuditLog(
      orgId,
      { userId: actor.user_id, email: actor.email, name: actor.full_name },
      "org_memberships",
      member.id,
      "UPDATE",
      reason,
      before as unknown as Record<string, unknown>,
      member as unknown as Record<string, unknown>,
    );

    return deepFreezeClone(member);
  }

  deactivateMember(principal: Principal, orgId: string, memberId: string, reason: string): OrgMembership {
    if (!reason || !reason.trim()) {
      throw new Error("A reason is required to deactivate a Member");
    }
    const actor = this.requireAdmin(principal, orgId);

    const member = this.memberships.find((m) => m.id === memberId && m.org_id === orgId);
    if (!member) throw new CrossTenantNotFoundError();

    if (member.status === "active" && member.role === "admin") {
      if (this.activeAdminCountAfter(orgId, memberId, { status: "deactivated" }) === 0) {
        throw new LastAdminGuardError();
      }
    }

    const before = { ...member };
    const deactivatedAt = this.now();
    Object.assign(member, {
      status: "deactivated",
      deactivated_at: deactivatedAt,
      deactivation_reason: reason,
      updated_at: deactivatedAt,
    });

    this.appendAuditLog(
      orgId,
      { userId: actor.user_id, email: actor.email, name: actor.full_name },
      "org_memberships",
      member.id,
      "UPDATE",
      reason,
      before as unknown as Record<string, unknown>,
      member as unknown as Record<string, unknown>,
    );

    return deepFreezeClone(member);
  }

  /** Always throws — org_memberships rows are deactivated, never hard-deleted (ADR-0002). */
  deleteMember(): never {
    throw new HardDeleteBlockedError();
  }

  // ---------------------------------------------------------------------
  // Per-Shop settings (Admin only)
  // ---------------------------------------------------------------------

  updateOrgSettings(
    principal: Principal,
    orgId: string,
    input: UpdateOrgSettingsInput,
    reason: string | null = null,
  ): Organization {
    const actor = this.requireAdmin(principal, orgId);

    const org = this.organizations.find((o) => o.id === orgId);
    if (!org) throw new CrossTenantNotFoundError();

    const validationError = validateOrgSettings(input);
    if (validationError) throw new Error(validationError);

    const before = { ...org };
    const patch: Partial<Organization> = {};
    if (input.timezone !== undefined) patch.timezone = input.timezone;
    if (input.toolIdPrefix !== undefined) patch.tool_id_prefix = input.toolIdPrefix;
    if (input.dueSoonDays !== undefined) patch.due_soon_days = input.dueSoonDays;
    if (input.weeklyDigestDay !== undefined) patch.weekly_digest_day = input.weeklyDigestDay;
    if (input.weeklyDigestHour !== undefined) patch.weekly_digest_hour = input.weeklyDigestHour;
    if (input.weeklyDigestMinute !== undefined) patch.weekly_digest_minute = input.weeklyDigestMinute;
    if (input.missingToolThresholdDays !== undefined) patch.missing_tool_threshold_days = input.missingToolThresholdDays;
    if (input.staleAircraftDays !== undefined) patch.stale_aircraft_days = input.staleAircraftDays;
    if (input.idleTimeoutMinutes !== undefined) patch.idle_timeout_minutes = input.idleTimeoutMinutes;

    // Skip no-op saves: if nothing actually changed, leave updated_at alone and
    // record no audit row (mirrors the 0003 UPDATE trigger's WHEN guard — a
    // no-op must not add noise to the compliance log).
    const changed = (Object.entries(patch) as Array<[keyof Organization, Organization[keyof Organization]]>).some(
      ([key, value]) => org[key] !== value,
    );
    if (!changed) return deepFreezeClone(org);

    Object.assign(org, patch, { updated_at: this.now() });

    this.appendAuditLog(
      orgId,
      { userId: actor.user_id, email: actor.email, name: actor.full_name },
      "organizations",
      org.id,
      "UPDATE",
      reason,
      before as unknown as Record<string, unknown>,
      org as unknown as Record<string, unknown>,
    );

    return deepFreezeClone(org);
  }

  // ---------------------------------------------------------------------
  // Platform Owner Shop provisioning (ADR-0001)
  // ---------------------------------------------------------------------

  provisionShopAsPlatformOwner(principal: Principal, input: ProvisionShopInput): ProvisionShopReceipt {
    if (!principal.isPlatformOwner) {
      throw new NotAuthorizedError("NOT_AUTHORIZED: only the Platform Owner may provision new Shops");
    }
    if (this.organizations.some((o) => o.slug === input.slug)) {
      throw new Error(`A Shop with slug ${input.slug} already exists`);
    }

    const orgId = this.idGen();
    const timestamp = this.now();
    const org: Organization = {
      id: orgId,
      slug: input.slug,
      name: input.name,
      tool_id_prefix: input.toolIdPrefix ?? "TL",
      timezone: input.timezone ?? "America/Los_Angeles",
      due_soon_days: 90,
      weekly_digest_day: 1,
      weekly_digest_hour: 6,
      weekly_digest_minute: 0,
      missing_tool_threshold_days: 30,
      stale_aircraft_days: 30,
      idle_timeout_minutes: 30,
      created_by: principal.userId,
      created_at: timestamp,
      updated_at: timestamp,
    };
    this.organizations.push(org);

    const adminMembership: OrgMembership = {
      id: this.idGen(),
      org_id: orgId,
      user_id: null,
      email: input.adminEmail,
      full_name: input.adminFullName,
      role: "admin",
      is_cal_designee: false,
      is_designated_auditor: false,
      status: "invited",
      certificate_type: "N/A",
      certificate_number: "N/A",
      invited_by: principal.userId,
      deactivated_at: null,
      deactivation_reason: null,
      created_at: timestamp,
      updated_at: timestamp,
    };
    this.memberships.push(adminMembership);

    const platformActor = { userId: principal.userId, email: principal.email, name: principal.fullName };
    this.appendAuditLog(orgId, platformActor, "organizations", org.id, "INSERT", "Shop provisioned by Platform Owner", null, org as unknown as Record<string, unknown>);
    this.appendAuditLog(
      orgId,
      platformActor,
      "org_memberships",
      adminMembership.id,
      "INSERT",
      "Shop provisioned by Platform Owner — initial Admin invitation",
      null,
      adminMembership as unknown as Record<string, unknown>,
    );

    // The Platform Owner intentionally receives no org_memberships row of their own,
    // so they retain zero read access to this Shop unless separately invited (ADR-0001).
    return {
      org_id: org.id,
      shop_name: org.name,
      initial_admin_email: adminMembership.email,
      invite_status: "invited",
    };
  }
}
