# Offline Audit Findings Outbox

Guided Location Audits start online by downloading a read-only snapshot of the target Location subtree into the phone's IndexedDB storage and record every scan, count, condition check, and offline sign-off into an append-only client outbox keyed by client-generated UUIDs. When connectivity returns, outbox entries sync idempotently to the server as immutable **Audit Findings**—immediately applying safety flags (`Missing`, `Unserviceable`, `Quarantined`) while holding consumable quantity differences as findings until applied via non-overwriting **Variance Adjustments** upon official audit sign-off or review.

## Considered Options

- **Online-only phone audits**: Rejected (#6, #18) because hangar back store rooms, enclosed cabinets, aircraft interiors, and ramps have unreliable Wi-Fi/cellular signal.
- **Full cold-start offline replica of the entire Shop database**: Rejected for Release 1 (#6, #18) due to high complexity, iOS Safari 7-day storage eviction risks, and multi-device merge conflicts across unrelated shop records.
- **Last-write-wins offline sync that directly overwrites live Lot quantities and Tool locations**: Rejected because a mechanic drawing consumables online while an offline audit is in progress would have their draw silently clobbered when the auditor reconnects.

## Consequences

- Audits can be counted and signed offline in dead zones, displaying a `"Signed offline — pending sync"` banner until reconnected.
- The official dated audit record and generated Audit PDF are finalized on the server only after all outbox findings for that audit have synced.
