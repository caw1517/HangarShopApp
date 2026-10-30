import type { AuditLogEntry, Organization, OrgMembership, Principal } from "./types";

export const ORG_APEX_ID = "00a00001-1111-4111-8111-111111111111";
export const ORG_CASCADE_ID = "00a00002-2222-4222-8222-222222222222";

export const ELENA_APEX_ID = "00b00001-1111-4111-8111-100000000001";
export const MARCUS_APEX_ID = "00b00002-1111-4111-8111-100000000002";
export const DEVON_APEX_ID = "00b00003-1111-4111-8111-100000000003";
export const TARIQ_APEX_ID = "00b00004-1111-4111-8111-100000000004";
export const HANNAH_APEX_ID = "00b00005-1111-4111-8111-100000000005";

export const ELENA_CASCADE_ID = "00b00006-2222-4222-8222-200000000001";
export const JORDAN_CASCADE_ID = "00b00007-2222-4222-8222-200000000002";

export const ELENA_USER_ID = "u-elena-rostova";
export const MARCUS_USER_ID = "u-marcus-vance";
export const DEVON_USER_ID = "u-devon-brooks";
export const HANNAH_USER_ID = "u-hannah-lindqvist";
export const JORDAN_USER_ID = "u-jordan-reyes";

export const ORG_SLUG_BY_ID: Record<string, string> = {
  [ORG_APEX_ID]: "org-apex-h1",
  [ORG_CASCADE_ID]: "org-cascade-fs",
};

export const ORG_ID_BY_SLUG: Record<string, string> = {
  "org-apex-h1": ORG_APEX_ID,
  "org-cascade-fs": ORG_CASCADE_ID,
};

export const PLATFORM_OWNER: Principal = {
  userId: "u-platform-owner",
  email: "owner@hangarshopapp.internal",
  fullName: "Platform Owner",
  isPlatformOwner: true,
};

export function seedOrganizations(): Organization[] {
  return [
    {
      id: ORG_APEX_ID,
      slug: "org-apex-h1",
      name: "Apex Charter MX — Hangar 1",
      tool_id_prefix: "TL",
      timezone: "America/Los_Angeles",
      due_soon_days: 90,
      weekly_digest_day: 1,
      weekly_digest_hour: 6,
      weekly_digest_minute: 0,
      missing_tool_threshold_days: 30,
      stale_aircraft_days: 30,
      idle_timeout_minutes: 30,
      created_by: ELENA_USER_ID,
      created_at: "2025-01-06T06:00:00.000Z",
      updated_at: "2025-01-06T06:00:00.000Z",
    },
    {
      id: ORG_CASCADE_ID,
      slug: "org-cascade-fs",
      name: "Cascade Flight Services",
      tool_id_prefix: "CFS",
      timezone: "America/Denver",
      due_soon_days: 60,
      weekly_digest_day: 1,
      weekly_digest_hour: 6,
      weekly_digest_minute: 0,
      missing_tool_threshold_days: 21,
      stale_aircraft_days: 14,
      idle_timeout_minutes: 30,
      created_by: JORDAN_USER_ID,
      created_at: "2025-02-10T06:00:00.000Z",
      updated_at: "2025-02-10T06:00:00.000Z",
    },
  ];
}

export function seedMemberships(): OrgMembership[] {
  return [
    {
      id: ELENA_APEX_ID,
      org_id: ORG_APEX_ID,
      user_id: ELENA_USER_ID,
      email: "elena.rostova@apexchartermx.example",
      full_name: "Elena Rostova",
      role: "admin",
      is_cal_designee: true,
      is_designated_auditor: false,
      status: "active",
      certificate_type: "A&P / IA",
      certificate_number: "3948102",
      invited_by: null,
      deactivated_at: null,
      deactivation_reason: null,
      created_at: "2025-01-06T06:00:00.000Z",
      updated_at: "2025-01-06T06:00:00.000Z",
    },
    {
      id: MARCUS_APEX_ID,
      org_id: ORG_APEX_ID,
      user_id: MARCUS_USER_ID,
      email: "marcus.vance@apexchartermx.example",
      full_name: "Marcus Vance",
      role: "inspector",
      is_cal_designee: true,
      is_designated_auditor: true,
      status: "active",
      certificate_type: "A&P",
      certificate_number: "4102938",
      invited_by: ELENA_USER_ID,
      deactivated_at: null,
      deactivation_reason: null,
      created_at: "2025-01-07T09:00:00.000Z",
      updated_at: "2025-01-07T09:00:00.000Z",
    },
    {
      id: DEVON_APEX_ID,
      org_id: ORG_APEX_ID,
      user_id: DEVON_USER_ID,
      email: "devon.brooks@apexchartermx.example",
      full_name: "Devon Brooks",
      role: "mechanic",
      is_cal_designee: false,
      is_designated_auditor: true,
      status: "active",
      certificate_type: "A&P",
      certificate_number: "4829104",
      invited_by: ELENA_USER_ID,
      deactivated_at: null,
      deactivation_reason: null,
      created_at: "2025-01-08T09:00:00.000Z",
      updated_at: "2025-01-08T09:00:00.000Z",
    },
    {
      id: TARIQ_APEX_ID,
      org_id: ORG_APEX_ID,
      user_id: null,
      email: "tariq.m@apexchartermx.example",
      full_name: "Tariq Al-Mansoor",
      role: "mechanic",
      is_cal_designee: false,
      is_designated_auditor: false,
      status: "invited",
      certificate_type: "Repairman",
      certificate_number: "5190231",
      invited_by: ELENA_USER_ID,
      deactivated_at: null,
      deactivation_reason: null,
      created_at: "2025-09-02T09:00:00.000Z",
      updated_at: "2025-09-02T09:00:00.000Z",
    },
    {
      id: HANNAH_APEX_ID,
      org_id: ORG_APEX_ID,
      user_id: HANNAH_USER_ID,
      email: "hannah.l@apexchartermx.example",
      full_name: "Hannah Lindqvist",
      role: "mechanic",
      is_cal_designee: false,
      is_designated_auditor: false,
      status: "deactivated",
      certificate_type: "A&P",
      certificate_number: "3719204",
      invited_by: ELENA_USER_ID,
      deactivated_at: "2025-09-15T14:30:00.000Z",
      deactivation_reason: "Departed technician — voluntary resignation",
      created_at: "2025-01-09T09:00:00.000Z",
      updated_at: "2025-09-15T14:30:00.000Z",
    },
    {
      id: ELENA_CASCADE_ID,
      org_id: ORG_CASCADE_ID,
      user_id: ELENA_USER_ID,
      email: "elena.rostova@cascadeflightservices.example",
      full_name: "Elena Rostova",
      role: "inspector",
      is_cal_designee: false,
      is_designated_auditor: false,
      status: "active",
      certificate_type: "A&P / IA",
      certificate_number: "3948102",
      invited_by: JORDAN_USER_ID,
      deactivated_at: null,
      deactivation_reason: null,
      created_at: "2025-02-11T09:00:00.000Z",
      updated_at: "2025-02-11T09:00:00.000Z",
    },
    {
      id: JORDAN_CASCADE_ID,
      org_id: ORG_CASCADE_ID,
      user_id: JORDAN_USER_ID,
      email: "jordan.reyes@cascadeflightservices.example",
      full_name: "Jordan Reyes",
      role: "admin",
      is_cal_designee: true,
      is_designated_auditor: false,
      status: "active",
      certificate_type: "A&P / IA",
      certificate_number: "6002914",
      invited_by: null,
      deactivated_at: null,
      deactivation_reason: null,
      created_at: "2025-02-10T06:00:00.000Z",
      updated_at: "2025-02-10T06:00:00.000Z",
    },
  ];
}

function insertEntry(
  id: string,
  orgId: string,
  tableName: string,
  recordId: string,
  actor: { userId: string | null; email: string; name: string },
  afterData: Record<string, unknown>,
  createdAt: string,
): AuditLogEntry {
  return {
    id,
    org_id: orgId,
    actor_user_id: actor.userId,
    actor_email: actor.email,
    actor_name: actor.name,
    table_name: tableName,
    record_id: recordId,
    action: "INSERT",
    reason: null,
    before_data: null,
    after_data: afterData,
    created_at: createdAt,
  };
}

export function seedAuditLog(): AuditLogEntry[] {
  const elena = { userId: ELENA_USER_ID, email: "elena.rostova@apexchartermx.example", name: "Elena Rostova" };
  const jordan = { userId: JORDAN_USER_ID, email: "jordan.reyes@cascadeflightservices.example", name: "Jordan Reyes" };

  return [
    insertEntry("00c00001-0000-4000-8000-000000000001", ORG_APEX_ID, "organizations", ORG_APEX_ID, elena, {
      slug: "org-apex-h1",
      name: "Apex Charter MX — Hangar 1",
    }, "2025-01-06T06:00:00.000Z"),
    insertEntry("00c00002-0000-4000-8000-000000000002", ORG_APEX_ID, "org_memberships", ELENA_APEX_ID, elena, {
      email: "elena.rostova@apexchartermx.example",
      role: "admin",
    }, "2025-01-06T06:00:00.000Z"),
    insertEntry("00c00003-0000-4000-8000-000000000003", ORG_APEX_ID, "org_memberships", MARCUS_APEX_ID, elena, {
      email: "marcus.vance@apexchartermx.example",
      role: "inspector",
    }, "2025-01-07T09:00:00.000Z"),
    insertEntry("00c00004-0000-4000-8000-000000000004", ORG_APEX_ID, "org_memberships", DEVON_APEX_ID, elena, {
      email: "devon.brooks@apexchartermx.example",
      role: "mechanic",
    }, "2025-01-08T09:00:00.000Z"),
    insertEntry("00c00005-0000-4000-8000-000000000005", ORG_APEX_ID, "org_memberships", HANNAH_APEX_ID, elena, {
      email: "hannah.l@apexchartermx.example",
      role: "mechanic",
    }, "2025-01-09T09:00:00.000Z"),
    insertEntry("00c00006-0000-4000-8000-000000000006", ORG_APEX_ID, "org_memberships", TARIQ_APEX_ID, elena, {
      email: "tariq.m@apexchartermx.example",
      role: "mechanic",
    }, "2025-09-02T09:00:00.000Z"),
    {
      id: "00c00007-0000-4000-8000-000000000007",
      org_id: ORG_APEX_ID,
      actor_user_id: ELENA_USER_ID,
      actor_email: elena.email,
      actor_name: elena.name,
      table_name: "org_memberships",
      record_id: HANNAH_APEX_ID,
      action: "UPDATE",
      reason: "Departed technician — voluntary resignation",
      before_data: { status: "active", deactivated_at: null },
      after_data: { status: "deactivated", deactivated_at: "2025-09-15T14:30:00.000Z" },
      created_at: "2025-09-15T14:30:00.000Z",
    },
    insertEntry("00c00008-0000-4000-8000-000000000008", ORG_CASCADE_ID, "organizations", ORG_CASCADE_ID, jordan, {
      slug: "org-cascade-fs",
      name: "Cascade Flight Services",
    }, "2025-02-10T06:00:00.000Z"),
    insertEntry("00c00009-0000-4000-8000-000000000009", ORG_CASCADE_ID, "org_memberships", JORDAN_CASCADE_ID, jordan, {
      email: "jordan.reyes@cascadeflightservices.example",
      role: "admin",
    }, "2025-02-10T06:00:00.000Z"),
    insertEntry("00c00010-0000-4000-8000-000000000010", ORG_CASCADE_ID, "org_memberships", ELENA_CASCADE_ID, jordan, {
      email: "elena.rostova@cascadeflightservices.example",
      role: "inspector",
    }, "2025-02-11T09:00:00.000Z"),
  ];
}
