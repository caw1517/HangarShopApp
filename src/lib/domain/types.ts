export type Role = "admin" | "inspector" | "mechanic";

export type MemberStatus = "invited" | "active" | "deactivated";

export type AuditAction = "INSERT" | "UPDATE" | "DELETE";

export interface Organization {
  id: string;
  slug: string;
  name: string;
  tool_id_prefix: string;
  timezone: string;
  due_soon_days: number;
  weekly_digest_day: number;
  weekly_digest_hour: number;
  weekly_digest_minute: number;
  missing_tool_threshold_days: number;
  stale_aircraft_days: number;
  idle_timeout_minutes: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgMembership {
  id: string;
  org_id: string;
  user_id: string | null;
  email: string;
  full_name: string;
  role: Role;
  is_cal_designee: boolean;
  is_designated_auditor: boolean;
  status: MemberStatus;
  certificate_type: string;
  certificate_number: string;
  invited_by: string | null;
  deactivated_at: string | null;
  deactivation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  org_id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  actor_name: string | null;
  table_name: string;
  record_id: string;
  action: AuditAction;
  reason: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
}

/** Any caller attempting an action against the store — a Shop Member or the Platform Owner. */
export interface Principal {
  userId: string;
  email: string;
  fullName: string;
  isPlatformOwner?: boolean;
}

export interface ProvisionShopInput {
  name: string;
  slug: string;
  toolIdPrefix?: string;
  timezone?: string;
  adminEmail: string;
  adminFullName: string;
}

export interface ProvisionShopReceipt {
  org_id: string;
  shop_name: string;
  initial_admin_email: string;
  invite_status: "invited";
}

export interface InviteMemberInput {
  email: string;
  fullName: string;
  role: Role;
  isCalDesignee?: boolean;
  isDesignatedAuditor?: boolean;
  certificateType?: string;
  certificateNumber?: string;
}

export interface UpdateMemberInput {
  role?: Role;
  isCalDesignee?: boolean;
  isDesignatedAuditor?: boolean;
  certificateType?: string;
  certificateNumber?: string;
}

export interface UpdateOrgSettingsInput {
  timezone?: string;
  toolIdPrefix?: string;
  dueSoonDays?: number;
  weeklyDigestDay?: number;
  weeklyDigestHour?: number;
  weeklyDigestMinute?: number;
  missingToolThresholdDays?: number;
  staleAircraftDays?: number;
  idleTimeoutMinutes?: number;
}
