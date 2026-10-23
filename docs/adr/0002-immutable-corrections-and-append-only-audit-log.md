# Immutable Corrections and Append-Only Audit Log

All changes to tracking data in HangarShopApp follow a strict no-overwrite, no-delete compliance model: every table mutation is captured by a database-level append-only `audit_log` trigger recording the authenticated user (`auth.uid()`), `org_id`, timestamp, and before/after JSON snapshots, while domain corrections (calibration due-date entry-error fixes, usage log corrections, and consumable audit quantity reconciliations) are recorded as explicit new adjustment/correction entries with a mandatory reason rather than mutating prior history in place.

## Considered Options

- **In-place updates for quantity counts and calibration corrections**: Rejected because the operator's maintenance manual prohibits erasing or overwriting tracking data and requires a stated reason for every correction.
- **Supabase's archived `supa_audit` extension**: Rejected (#3) because it is unmaintained and does not reliably capture the authenticated application user and reason alongside `org_id`.
- **Custom append-only `jsonb` Postgres trigger + explicit domain adjustment records**: Chosen because it guarantees a tamper-evident database trail for every edit while surfacing domain-meaningful reasons (such as Variance Adjustments and Cal Designee entry-error corrections) directly in the UI and Audit PDFs.

## Consequences

- Application database roles have `UPDATE` and `DELETE` revoked on `audit_log` and ledger tables.
- Domain entities (`Tools`, `Consumable Items`, `Lots`, `Locations`, `Aircraft`, `Major Components`, `Members`) are deactivated, retired, depleted, or disposed rather than deleted.
