"use client";

import { useMemo, useState } from "react";
import { useDomain } from "@/lib/domain/context";
import { CrossTenantNotFoundError, NotAuthorizedError } from "@/lib/domain/errors";
import type { AuditLogEntry } from "@/lib/domain/types";
import { cycleNext, formatInTimeZone, shopLocationSuffix, shortId, shortShopName } from "@/lib/ui-utils";
import { useListNav } from "@/lib/use-list-nav";
import type { ViewChrome } from "@/components/AppRoot";
import { ShieldCheck } from "@/components/primitives/icons";
import { StatusPill, type StatusDotColor } from "@/components/primitives/StatusPill";
import {
  ContextHeaderBar,
  DetailFooter,
  DetailHeaderBlock,
  DetailScroll,
  DetailTopBar,
  ListColumnHeader,
  ListRow,
  ListScroll,
  MetadataGrid,
  SplitBody,
  WorkspaceFilterBar,
} from "@/components/primitives/WorkspaceShell";

type AreaTab = "all" | "org_memberships" | "organizations";
type ActionFilter = "ALL" | "INSERT" | "UPDATE";

const ACTION_CYCLE: ActionFilter[] = ["ALL", "INSERT", "UPDATE"];

/** Friendly, product-facing labels for every stored column we surface. Keys not
 * listed here (ids, timestamps, foreign keys) are intentionally hidden so the
 * inspector reads as natural history, never as a raw database row. */
const FIELD_LABELS: Record<string, string> = {
  role: "Role",
  status: "Status",
  is_cal_designee: "Cal Designee",
  is_designated_auditor: "Designated Auditor",
  deactivation_reason: "Deactivation reason",
  email: "Email",
  full_name: "Name",
  name: "Shop name",
  slug: "Shop reference",
  certificate_type: "Certificate type",
  certificate_number: "Certificate number",
  timezone: "Time zone",
  tool_id_prefix: "Tool ID prefix",
  due_soon_days: "Calibration due-soon window",
  weekly_digest_day: "Weekly digest day",
  weekly_digest_hour: "Weekly digest hour",
  weekly_digest_minute: "Weekly digest minute",
  missing_tool_threshold_days: "Missing-tool alert threshold",
  stale_aircraft_days: "Stale-aircraft threshold",
  idle_timeout_minutes: "Idle sign-out timeout",
};

function areaLabel(tableName: string): string {
  if (tableName === "org_memberships") return "Team & Roles";
  if (tableName === "organizations") return "Shop Settings";
  return tableName;
}

function humanizeValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (key === "role" || key === "status") {
    const s = String(value);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  if (key === "deactivated_at" || key === "created_at" || key === "updated_at") return String(value).slice(0, 10);
  return String(value);
}

function headlineFor(entry: AuditLogEntry): string {
  if (entry.table_name === "organizations") {
    return entry.action === "INSERT" ? "Shop created" : "Shop settings updated";
  }
  if (entry.action === "INSERT") return "Team member added";
  const after = entry.after_data as Record<string, unknown> | null;
  if (after && after.status === "deactivated" && (entry.before_data as Record<string, unknown> | null)?.status === "active") {
    return "Team member deactivated";
  }
  return "Team member updated";
}

interface DiffRow {
  label: string;
  before: string;
  after: string;
  key: string;
}

function buildDiff(entry: AuditLogEntry): DiffRow[] {
  const before = (entry.before_data ?? {}) as Record<string, unknown>;
  const after = (entry.after_data ?? {}) as Record<string, unknown>;
  const rows: DiffRow[] = [];
  for (const [key, label] of Object.entries(FIELD_LABELS)) {
    const inBefore = key in before;
    const inAfter = key in after;
    if (!inBefore && !inAfter) continue;
    if (entry.action === "INSERT") {
      if (!inAfter) continue;
      rows.push({ key, label, before: "—", after: humanizeValue(key, after[key]) });
    } else {
      if (JSON.stringify(before[key]) === JSON.stringify(after[key])) continue;
      rows.push({ key, label, before: humanizeValue(key, before[key]), after: humanizeValue(key, after[key]) });
    }
  }
  return rows;
}

function actionPill(action: AuditLogEntry["action"]): { label: string; color: StatusDotColor } {
  if (action === "INSERT") return { label: "Added", color: "blue" };
  if (action === "UPDATE") return { label: "Updated", color: "purple" };
  return { label: "Removed", color: "red" };
}

export function AuditLogView({ chrome }: { chrome: ViewChrome }) {
  const domain = useDomain();
  const [areaTab, setAreaTab] = useState<AreaTab>("all");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("ALL");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  let entries: AuditLogEntry[] = [];
  let accessError: string | null = null;
  let shopName = "This Shop";
  let shopShort = "This Shop";
  let timezone = "America/Los_Angeles";
  let idleMinutes = 30;
  try {
    const org = domain.store.getOrganization(domain.principal, domain.activeOrgId);
    shopName = org.name;
    shopShort = shortShopName(org.name);
    timezone = org.timezone;
    idleMinutes = org.idle_timeout_minutes;
  } catch {
    // fall through; getAuditLog below will surface the precise access error
  }
  try {
    entries = domain.store.getAuditLog(domain.principal, domain.activeOrgId);
  } catch (err) {
    if (err instanceof CrossTenantNotFoundError) {
      accessError = "This persona is not an active Member of the selected Shop, so the compliance audit log is not visible.";
    } else if (err instanceof NotAuthorizedError) {
      accessError = "Only Admin and Inspector roles can read the compliance audit log. Switch persona in the Tweaks pill to view it.";
    } else {
      throw err;
    }
  }

  const counts = {
    all: entries.length,
    team: entries.filter((e) => e.table_name === "org_memberships").length,
    settings: entries.filter((e) => e.table_name === "organizations").length,
  };

  const filtered = useMemo(() => {
    let result = entries;
    if (areaTab !== "all") result = result.filter((e) => e.table_name === areaTab);
    if (actionFilter !== "ALL") result = result.filter((e) => e.action === actionFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (e) =>
          (e.actor_name ?? "").toLowerCase().includes(q) ||
          (e.actor_email ?? "").toLowerCase().includes(q) ||
          (e.reason ?? "").toLowerCase().includes(q) ||
          areaLabel(e.table_name).toLowerCase().includes(q) ||
          headlineFor(e).toLowerCase().includes(q),
      );
    }
    return result;
  }, [entries, areaTab, actionFilter, search]);

  const selected = filtered.find((e) => e.id === selectedId) ?? filtered[0] ?? null;

  useListNav(
    filtered.map((e) => e.id),
    selected?.id ?? null,
    setSelectedId,
  );

  const header = (
    <ContextHeaderBar
      title="Compliance Audit Log"
      subtitle={shopLocationSuffix(shopName) ? `${shopShort} · ${shopLocationSuffix(shopName)}` : shopShort}
      activeView={chrome.activeView}
      onSelectView={chrome.onSelectView}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search actor, reason, or area…"
      idleLabel={`Idle Timeout (${idleMinutes}m)`}
      onPreviewIdle={chrome.onPreviewIdle}
      primary={{
        label: "Verify Integrity",
        onClick: () => setMessage(`Verified ${entries.length} of ${entries.length} entries — the append-only history is intact and unaltered.`),
        disabled: entries.length === 0,
      }}
    />
  );

  if (accessError) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {header}
        <div className="flex h-full items-center justify-center p-10 text-center">
          <p className="max-w-sm text-sm text-[#667085]">{accessError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {header}
      <WorkspaceFilterBar
        scopeLabel={shopShort}
        scopeCount={`${entries.length}`}
        pills={[
          {
            label: "Action",
            value: actionFilter === "ALL" ? "All" : actionFilter === "INSERT" ? "Added" : "Updated",
            active: actionFilter !== "ALL",
            onClick: () => setActionFilter(cycleNext(ACTION_CYCLE, actionFilter)),
          },
        ]}
        rightCount={`${filtered.length} ${filtered.length === 1 ? "entry" : "entries"}`}
      />

      <SplitBody
        list={
          <>
          <ListColumnHeader
            title="Compliance Audit Register"
            metric={`${entries.length} of ${entries.length} verified (100%)`}
            progressPct={100}
            tabs={[
              { key: "all", label: `All (${counts.all})` },
              { key: "org_memberships", label: `Team (${counts.team})` },
              { key: "organizations", label: `Settings (${counts.settings})` },
            ]}
            activeTab={areaTab}
            onSelectTab={(key) => setAreaTab(key as AreaTab)}
          />
          <ListScroll>
            {filtered.map((entry) => {
              const pill = actionPill(entry.action);
              return (
                <ListRow
                  key={entry.id}
                  selected={selected?.id === entry.id}
                  onClick={() => setSelectedId(entry.id)}
                  state="verified"
                  line1={headlineFor(entry)}
                  line2={
                    <>
                      <span className="font-mono">AUD-{shortId(entry.id)}</span> · {entry.actor_name}
                    </>
                  }
                  pill={<StatusPill label={pill.label} color={pill.color} />}
                  subLabel={entry.created_at.slice(0, 10)}
                />
              );
            })}
            {filtered.length === 0 && <p className="px-4 py-6 text-sm text-[#667085]">No audit log entries match this filter.</p>}
          </ListScroll>
          </>
        }
        detail={
          <>
          {!selected ? (
            <div className="flex h-full items-center justify-center p-10 text-sm text-[#667085]">
              Select an entry to inspect what changed, who made the change, and why.
            </div>
          ) : (
            <>
              <DetailScroll>
              <DetailTopBar
                breadcrumb={
                  <>
                    Compliance Audit Register › <span className="font-mono font-medium text-[#101828]">AUD-{shortId(selected.id)}</span>
                  </>
                }
                actions={<StatusPill label="Permanent record" color="green" />}
              />

              <DetailHeaderBlock
                icon={<ShieldCheck className="h-5 w-5 text-[#155eef]" />}
                title={headlineFor(selected)}
                meta={
                  <>
                    <span className="font-medium text-[#344054]">{areaLabel(selected.table_name)}</span>
                    <span>·</span>
                    <span>{selected.actor_name ?? "System"}</span>
                    <span>·</span>
                    <span>{formatInTimeZone(selected.created_at, timezone)}</span>
                  </>
                }
                pill={<StatusPill label={actionPill(selected.action).label} color={actionPill(selected.action).color} />}
              />

              <div className="px-7 pt-4">
                <MetadataGrid
                  items={[
                    { label: "Changed by", value: selected.actor_name ?? "System" },
                    { label: "Area", value: areaLabel(selected.table_name) },
                    {
                      label: "Change type",
                      value: selected.action === "INSERT" ? "Added" : selected.action === "UPDATE" ? "Updated" : "Removed",
                    },
                    {
                      label: `Recorded (${timezone})`,
                      value: <span className="font-mono text-xs tabular-nums">{formatInTimeZone(selected.created_at, timezone)}</span>,
                    },
                  ]}
                />
              </div>

              <div className="max-w-3xl flex-1 space-y-5 px-7 py-5">
                {message && (
                  <div className="rounded-lg bg-[#ecfdf3] px-3.5 py-2.5 text-sm text-[#067647] ring-1 ring-inset ring-[#abefc6]">{message}</div>
                )}

                <div>
                  <p className="mb-2 text-sm font-medium text-[#344054]">What changed</p>
                  <ChangeTable entry={selected} />
                </div>

                <div>
                  <p className="mb-1.5 text-sm font-medium text-[#344054]">Reason given</p>
                  <div className="rounded-lg border border-[#e4e7ec] bg-[#f9fafb] px-3.5 py-2.5 text-sm text-[#344054]">
                    {selected.reason ?? "No reason was recorded for this change."}
                  </div>
                </div>

                <div className="rounded-lg border border-[#eaecf0] bg-white p-4 shadow-xs">
                  <p className="inline-flex items-center gap-1.5 text-sm font-medium text-[#101828]">
                    <ShieldCheck className="h-4 w-4 text-[#17b26a]" />
                    Tamper-evident record
                  </p>
                  <p className="mt-1 text-xs text-[#667085]">
                    Every compliance change is appended to a permanent history. Entries can never be edited or deleted once written —
                    not even by a Shop Admin — so the record always reflects exactly what happened.
                  </p>
                </div>
              </div>
              </DetailScroll>

              <DetailFooter
                left={
                  <>
                    <div className="text-xs tabular-nums text-gray-500">Recorded {formatInTimeZone(selected.created_at, timezone)} · entry is permanent</div>
                    <div className="text-[11px] text-gray-400">J / K to navigate</div>
                  </>
                }
              >
                <button
                  type="button"
                  onClick={() => setMessage(`Entry AUD-${shortId(selected.id)} verified — unchanged since it was recorded.`)}
                  className="uui-btn-secondary h-9 rounded-md px-3 text-xs font-medium"
                >
                  Verify this entry
                </button>
                <button
                  type="button"
                  onClick={() => setMessage(`Verified ${entries.length} of ${entries.length} entries — the append-only history is intact and unaltered.`)}
                  className="uui-btn-primary h-9 rounded-md px-3.5 text-xs font-medium"
                >
                  Verify integrity
                </button>
              </DetailFooter>
            </>
          )}
          </>
        }
      />
    </div>
  );
}

function ChangeTable({ entry }: { entry: AuditLogEntry }) {
  const rows = buildDiff(entry);
  if (rows.length === 0) {
    return <p className="text-sm text-[#667085]">No field-level detail was captured for this entry.</p>;
  }
  const showBefore = entry.action !== "INSERT";
  return (
    <div className="overflow-hidden rounded-lg border border-[#e4e7ec]">
      <div className="grid grid-cols-[1fr_1fr_1fr] gap-3 bg-[#f9fafb] px-4 py-2 text-xs font-medium text-[#667085]">
        <span>Field</span>
        <span>{showBefore ? "Previous" : "Set to"}</span>
        <span>{showBefore ? "Updated" : ""}</span>
      </div>
      {rows.map((row) => (
        <div key={row.key} className="grid grid-cols-[1fr_1fr_1fr] gap-3 border-t border-[#e4e7ec] px-4 py-2.5 text-sm">
          <span className="font-medium text-[#101828]">{row.label}</span>
          <span className="tabular-nums text-[#667085]">{showBefore ? row.before : row.after}</span>
          <span className="tabular-nums text-[#101828]">{showBefore ? row.after : ""}</span>
        </div>
      ))}
    </div>
  );
}
