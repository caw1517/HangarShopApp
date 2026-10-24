/**
 * Thrown whenever a caller queries or mutates a Shop they are not an active Member of.
 * Mirrors ADR-0001: cross-tenant lookups must be indistinguishable from "does not exist".
 */
export class CrossTenantNotFoundError extends Error {
  constructor(message = "CROSS_TENANT_NOT_FOUND") {
    super(message);
    this.name = "CrossTenantNotFoundError";
  }
}

/**
 * Thrown when an action would leave a Shop with zero active Admins.
 * Mirrors the `enforce_last_admin_guard()` Postgres trigger.
 */
export class LastAdminGuardError extends Error {
  constructor(message = "LAST_ADMIN_GUARD: this action would leave the Shop with no active Admin") {
    super(message);
    this.name = "LastAdminGuardError";
  }
}

/**
 * Thrown on any attempt to mutate or delete an existing audit_log entry.
 * Mirrors the `prevent_audit_log_mutation()` Postgres trigger + REVOKE UPDATE/DELETE.
 */
export class ImmutableAuditLogError extends Error {
  constructor(message = "AUDIT_LOG_IMMUTABLE: audit_log rows cannot be updated or deleted") {
    super(message);
    this.name = "ImmutableAuditLogError";
  }
}

/** Thrown when a caller lacks the Role or compliance designation required for an action. */
export class NotAuthorizedError extends Error {
  constructor(message = "NOT_AUTHORIZED") {
    super(message);
    this.name = "NotAuthorizedError";
  }
}

/** Thrown on any attempt to hard-delete an org_memberships row (ADR-0002: deactivate, never delete). */
export class HardDeleteBlockedError extends Error {
  constructor(message = "HARD_DELETE_BLOCKED: members are deactivated, never deleted") {
    super(message);
    this.name = "HardDeleteBlockedError";
  }
}
