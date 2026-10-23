"use client";

import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { useDomain } from "@/lib/domain/context";
import { CrossTenantNotFoundError, NotAuthorizedError } from "@/lib/domain/errors";
import type { AuditLogEntry } from "@/lib/domain/types";
import { StatusPill, type StatusDotColor } from "@/components/primitives/StatusPill";
import { SplitViewWorkspace } from "@/components/primitives/SplitViewWorkspace";
import { TableCard, TableCardHeaderRow, TableCardRow } from "@/components/primitives/TableCard";
import { formatInTimeZone, shortId } from "@/lib/ui-utils";

type ActionFilter = "all" | "INSERT" | "UPDATE" | "organizations" | "org_memberships";

function pillColorFor(action: AuditLogEntry["action"]): StatusDotColor {
  if (action === "INSERT") return "blue";
  if (action === "UPDATE") return "purple";
  return "red";
}

function tableLabel(tableName: string): string {
  if (tableName === "org_memberships") return "Team & Roles";
  if (tableName === "organizations") return "Shop Settings";
  return tableName;
}

export function AuditLogView() {
  const domain = useDomain();
  const [filter, setFilter] = useState<ActionFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  let entries: AuditLogEntry[] = [];
  let accessError: string | null = null;
  try {
    entries = domain.store.getAuditLog(domain.principal, domain.activeOrgId);
  } catch (err) {
    if (err instanceof CrossTenantNotFoundError) {
      accessError = "This persona is not an active Member of the selected Shop, so the audit log is not visible.";
    } else if (err instanceof NotAuthorizedError) {
      accessError = "Only Admin and Inspector roles can read the compliance audit log. Switch persona to view it.";
    } else {
      throw err;
    }
  }

  const filtered = useMemo(() => {
    let result = entries;
    if (filter === "INSERT" || filter === "UPDATE") result = result.filter((e) => e.action === filter);
    else if (filter === "organizations" || filter === "org_memberships") result = result.filter((e) => e.table_name === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (e) =>
          (e.actor_name ?? "").toLowerCase().includes(q) ||
          (e.actor_email ?? "").toLowerCase().includes(q) ||
          (e.reason ?? "").toLowerCase().includes(q) ||
          e.table_name.toLowerCase().includes(q),
      );
    }
    return result;
  }, [entries, filter, search]);

  const selected = filtered.find((e) => e.id === selectedId) ?? filtered[0] ?? null;

  let timezone = "America/Los_Angeles";
  try {
    timezone = domain.store.getOrganization(domain.principal, domain.activeOrgId).timezone;
  } catch {
    // leave default
  }

  if (accessError) {
    return (
      <div className="flex h-full items-center justify-center p-10 text-center">
        <p className="max-w-sm text-sm text-[#667085]">{accessError}</p>
      </div>
    );
  }

  return (
    <SplitViewWorkspace>
      <div className="flex h-full flex-col">
        <div className="border-b border-[#e4e7ec] bg-white px-4 py-3">
          <h2 className="text-sm font-semibold text-[#101828]">Compliance Audit Log</h2>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actor, reason, or table"
            className="mt-2 w-full rounded-lg border border-[#d0d5dd] px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155eef]"
          />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(
              [
                ["all", "All actions"],
                ["INSERT", "Insert"],
                ["UPDATE", "Update"],
                ["organizations", "Shop Settings"],
                ["org_memberships", "Team & Roles"],
              ] as Array<[ActionFilter, string]>
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={clsx(
                  "rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
                  filter === key ? "bg-[#eff4ff] text-[#155eef] ring-[#b2ccff]" : "bg-white text-[#344054] ring-[#d0d5dd] hover:bg-[#f9fafb]",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <TableCard>
            <TableCardHeaderRow>
              <span>Entry</span>
              <span>Recorded</span>
            </TableCardHeaderRow>
            {filtered.map((entry) => {
              const isActive = selected?.id === entry.id;
              return (
                <TableCardRow key={entry.id} active={isActive} onClick={() => setSelectedId(entry.id)}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs tabular-nums text-[#667085]">
                      AUD-{shortId(entry.id)} · {entry.created_at}
                    </span>
                    <StatusPill label={`Recorded · ${entry.action}`} color={pillColorFor(entry.action)} />
                  </div>
                  <p className={clsx("text-sm", isActive ? "font-semibold text-[#101828]" : "font-medium text-[#101828]")}>
                    {tableLabel(entry.table_name)} · {shortId(entry.record_id)}
                  </p>
                  <p className="truncate text-xs text-[#667085]">
                    {entry.actor_name} ({entry.actor_email})
                  </p>
                </TableCardRow>
              );
            })}
            {filtered.length === 0 && <p className="px-4 py-6 text-sm text-[#667085]">No audit log entries match this filter.</p>}
          </TableCard>
        </div>
      </div>

      <div className="h-full p-6">
        {!selected ? (
          <p className="text-sm text-[#667085]">Select an audit log entry to inspect its previous and updated state.</p>
        ) : (
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-mono text-base font-semibold tabular-nums text-[#101828]">AUD-{shortId(selected.id)}</h1>
                <p className="text-sm text-[#667085]">
                  {tableLabel(selected.table_name)} · record {shortId(selected.record_id)}
                </p>
              </div>
              <StatusPill label="Verified log entry" color="green" />
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs font-medium text-[#667085]">Actor</dt>
                <dd className="text-[#101828]">{selected.actor_name ?? "—"}</dd>
                <dd className="text-xs text-[#667085]">{selected.actor_email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-[#667085]">Actor UID</dt>
                <dd className="font-mono text-xs tabular-nums text-[#101828]">{selected.actor_user_id ?? "System / Provisioning"}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-[#667085]">Timestamp ({timezone})</dt>
                <dd className="font-mono text-xs tabular-nums text-[#101828]">{formatInTimeZone(selected.created_at, timezone)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-[#667085]">Reason</dt>
                <dd className="text-[#101828]">{selected.reason ?? "No reason recorded"}</dd>
              </div>
            </dl>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <p className="mb-1.5 text-xs font-medium text-[#667085]">Previous state</p>
                <pre className="overflow-x-auto rounded-lg bg-[#f9fafb] p-3 font-mono text-xs tabular-nums text-[#344054] ring-1 ring-inset ring-[#e4e7ec]">
                  {selected.before_data ? JSON.stringify(selected.before_data, null, 2) : "null"}
                </pre>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-[#667085]">Updated state</p>
                <pre className="overflow-x-auto rounded-lg bg-[#f9fafb] p-3 font-mono text-xs tabular-nums text-[#344054] ring-1 ring-inset ring-[#e4e7ec]">
                  {selected.after_data ? JSON.stringify(selected.after_data, null, 2) : "null"}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </SplitViewWorkspace>
  );
}
