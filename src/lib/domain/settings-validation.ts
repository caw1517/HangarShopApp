import type { UpdateOrgSettingsInput } from "./types";

/**
 * Per-Shop settings bounds. These mirror the CHECK constraints in the Postgres
 * migrations exactly (0001 for the fully-bounded fields; 0002 caps the two
 * open-ended day thresholds at 3650) so the UI, the in-memory store, and the
 * database all reject the same values — no 0-day due-soon window, no "-5" tool
 * prefix, and no value above the Postgres integer range.
 */
export const SETTINGS_BOUNDS = {
  dueSoonDays: { min: 1, max: 365 },
  weeklyDigestDay: { min: 0, max: 6 },
  weeklyDigestHour: { min: 0, max: 23 },
  weeklyDigestMinute: { min: 0, max: 59 },
  missingToolThresholdDays: { min: 1, max: 3650 },
  staleAircraftDays: { min: 1, max: 3650 },
  idleTimeoutMinutes: { min: 5, max: 480 },
} as const;

export const TOOL_ID_PREFIX_PATTERN = /^[A-Za-z0-9]{1,8}$/;

/**
 * The Shop time zones offered in the UI. Every entry is a valid IANA name, so
 * this list is a subset of the database's pg_timezone_names check (added in
 * 0002) — the UI, the in-memory store, and the database all agree.
 */
export const VALID_TIMEZONES = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Anchorage",
] as const;

const LABELS: Record<keyof typeof SETTINGS_BOUNDS, string> = {
  dueSoonDays: "Calibration due-soon window (days)",
  weeklyDigestDay: "Weekly digest day",
  weeklyDigestHour: "Weekly digest hour",
  weeklyDigestMinute: "Weekly digest minute",
  missingToolThresholdDays: "Missing-tool alert threshold (days)",
  staleAircraftDays: "Stale-aircraft threshold (days)",
  idleTimeoutMinutes: "Idle sign-out timeout (minutes)",
};

/** Returns a human-readable error string, or null when every provided field is valid. */
export function validateOrgSettings(input: UpdateOrgSettingsInput): string | null {
  for (const key of Object.keys(SETTINGS_BOUNDS) as Array<keyof typeof SETTINGS_BOUNDS>) {
    const value = input[key];
    if (value === undefined) continue;
    const { min, max } = SETTINGS_BOUNDS[key];
    if (typeof value !== "number" || !Number.isInteger(value)) {
      return `${LABELS[key]} must be a whole number.`;
    }
    if (value < min || value > max) {
      return `${LABELS[key]} must be between ${min} and ${max}.`;
    }
  }
  if (input.toolIdPrefix !== undefined && !TOOL_ID_PREFIX_PATTERN.test(input.toolIdPrefix)) {
    return "Tool ID prefix must be 1–8 letters or digits (no spaces, dashes, or other symbols).";
  }
  if (input.timezone !== undefined && !(VALID_TIMEZONES as readonly string[]).includes(input.timezone)) {
    return "Time zone must be a recognized Shop time zone.";
  }
  return null;
}
