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
  if (value === null || value === undefined || value === "") return "None";
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
      rows.push({ key, label, before: "None", after: humanizeValue(key, after[key]) });
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

  let entries: AuditLogEntry[] = [];
  let accessError: string | null = null;
  let shopName = "This Shop";
  let shopShort = "This Shop";
  let timezone = "America/Los_Angeles";
  try {
    const org = domain.store.getOrganization(domain.principal, domain.activeOrgId);
    shopName = org.name;
    shopShort = shortShopName(org.name);
    timezone = org.timezone;
  } catch {
    // fall through; getAuditLog below will surface the precise access error
  }
  try {
    entries = domain.store.getAuditLog(domain.principal, domain.activeOrgId);
  } catch (err) {
    if (err instanceof CrossTenantNotFoundError) {
      accessError = "You are not an active Member of the selected Shop, so the compliance audit log is not visible.";
    } else if (err instanceof NotAuthorizedError) {
      accessError = "Only Admin and Inspector roles can read the compliance audit log.";
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
    />
  );

  if (accessError) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {header}
        <div className="flex h-full items-center justify-center p-10 text-center">
          <p className="max-w-sm text-sm text-slate-600">{accessError}</p>
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
            metric={`${entries.length} ${entries.length === 1 ? "entry" : "entries"}`}
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
                  squareTitle="Recorded"
                  line1={headlineFor(entry)}
                  line2={
                    <>
                      <span className="font-mono num">AUD-{shortId(entry.id)}</span> · {entry.actor_name}
                    </>
                  }
                  pill={<StatusPill label={pill.label} color={pill.color} />}
                  subLabel={<span className="num">{entry.created_at.slice(0, 10)}</span>}
                />
              );
            })}
            {filtered.length === 0 && <p className="px-4 py-6 text-sm text-slate-600">No audit log entries match this filter.</p>}
          </ListScroll>
          </>
        }
        detail={
          <>
          {!selected ? (
            <div className="flex h-full items-center justify-center p-10 text-sm text-slate-600">
              Select an entry to inspect what changed, who made the change, and why.
            </div>
          ) : (
            <>
              <DetailScroll>
              <DetailTopBar
                breadcrumb={
                  <>
                    Compliance Audit Register › <span className="font-mono font-medium text-slate-900">AUD-{shortId(selected.id)}</span>
                  </>
                }
                actions={<StatusPill label="Permanent record" color="green" />}
              />

              <DetailHeaderBlock
                icon={<ShieldCheck className="h-5 w-5 text-accent" />}
                title={headlineFor(selected)}
                meta={
                  <>
                    <span className="font-medium text-slate-700">{areaLabel(selected.table_name)}</span>
                    <span>·</span>
                    <span>{selected.actor_name ?? "System"}</span>
                    <span>·</span>
                    <span className="num">{formatInTimeZone(selected.created_at, timezone)}</span>
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
                      value: <span className="text-xs tabular-nums">{formatInTimeZone(selected.created_at, timezone)}</span>,
                    },
                  ]}
                />
              </div>

              <div className="max-w-3xl flex-1 space-y-5 px-7 py-5">
                <div>
                  <p className="mb-2 text-sm font-medium text-slate-700">What changed</p>
                  <ChangeTable entry={selected} />
                </div>

                <div>
                  <p className="mb-1.5 text-sm font-medium text-slate-700">Reason given</p>
                  <div className="rounded-sm border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700">
                    {selected.reason ?? "No reason was recorded for this change."}
                  </div>
                </div>

                <div className="rounded-sm border border-slate-200 bg-white p-4">
                  <p className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-900">
                    <ShieldCheck className="h-4 w-4 text-success-dot" />
                    Append-only record
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Entries can&apos;t be edited or deleted, including by admins.
                  </p>
                </div>
              </div>
              </DetailScroll>

              <DetailFooter
                left={
                  <>
                    <div className="text-xs text-slate-600">Recorded <span className="num">{formatInTimeZone(selected.created_at, timezone)}</span> · entry is permanent</div>
                  </>
                }
              >
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
    return <p className="text-sm text-slate-600">No field-level detail was captured for this entry.</p>;
  }
  const showBefore = entry.action !== "INSERT";
  return (
    <div className="overflow-hidden rounded-sm border border-slate-200">
      <div className="grid grid-cols-[1fr_1fr_1fr] gap-3 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600">
        <span>Field</span>
        <span>{showBefore ? "Previous" : "Set to"}</span>
        <span>{showBefore ? "Updated" : ""}</span>
      </div>
      {rows.map((row) => (
        <div key={row.key} className="grid grid-cols-[1fr_1fr_1fr] gap-3 border-t border-slate-200 px-4 py-2.5 text-sm">
          <span className="font-medium text-slate-900">{row.label}</span>
          <span className="tabular-nums text-slate-600">{showBefore ? row.before : row.after}</span>
          <span className="tabular-nums text-slate-900">{showBefore ? row.after : ""}</span>
        </div>
      ))}
    </div>
  );
}
