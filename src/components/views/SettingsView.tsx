"use client";

import { useEffect, useId, useState } from "react";
import { clsx } from "clsx";
import { useDomain } from "@/lib/domain/context";
import { CrossTenantNotFoundError } from "@/lib/domain/errors";
import { ORG_APEX_ID } from "@/lib/domain/seed";
import { VALID_TIMEZONES } from "@/lib/domain/settings-validation";
import type { Organization, ProvisionShopReceipt } from "@/lib/domain/types";
import { cycleNext, shopLocationSuffix, shortShopName } from "@/lib/ui-utils";
import { useListNav } from "@/lib/use-list-nav";
import type { ViewChrome } from "@/components/AppRoot";
import { Building, Lock, Settings as SettingsIcon, ShieldCheck } from "@/components/primitives/icons";
import { StatusPill, type StatusDotColor, type VerificationState } from "@/components/primitives/StatusPill";
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

type SectionKey = "thresholds" | "digest" | "provisioning" | "rls";

const SECTIONS: Array<{
  key: SectionKey;
  label: string;
  blurb: string;
  category: "Configuration" | "Security";
  icon: typeof SettingsIcon;
}> = [
  { key: "thresholds", label: "Compliance Thresholds", blurb: "Due-soon, missing-tool & stale windows", category: "Configuration", icon: SettingsIcon },
  { key: "digest", label: "Weekly Digest & Idle Timeout", blurb: "Scheduled summary and idle sign-out", category: "Configuration", icon: SettingsIcon },
  { key: "provisioning", label: "New Shop Provisioning", blurb: "Create a new Shop and invite its first Admin", category: "Security", icon: Building },
  { key: "rls", label: "Shop Isolation & Data Security", blurb: "Who can view and change each area", category: "Security", icon: Lock },
];

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIMEZONES = VALID_TIMEZONES;
const CATEGORY_CYCLE = ["all", "Configuration", "Security"] as const;
type CategoryTab = (typeof CATEGORY_CYCLE)[number];

const ORG_NAME_FALLBACK: Record<string, string> = {
  [ORG_APEX_ID]: "Apex Charter MX — Hangar 1",
};

function emptySettingsForm(org: Organization) {
  return {
    timezone: org.timezone,
    toolIdPrefix: org.tool_id_prefix,
    dueSoonDays: org.due_soon_days,
    weeklyDigestDay: org.weekly_digest_day,
    weeklyDigestHour: org.weekly_digest_hour,
    weeklyDigestMinute: org.weekly_digest_minute,
    missingToolThresholdDays: org.missing_tool_threshold_days,
    staleAircraftDays: org.stale_aircraft_days,
    idleTimeoutMinutes: org.idle_timeout_minutes,
  };
}
type SettingsFormState = ReturnType<typeof emptySettingsForm>;

function sectionPill(key: SectionKey, isPlatformOwner: boolean): { label: string; color: StatusDotColor; state: VerificationState } {
  if (key === "rls") return { label: "Enforced", color: "green", state: "verified" };
  if (key === "provisioning")
    return isPlatformOwner
      ? { label: "Available", color: "blue", state: "verified" }
      : { label: "Owner only", color: "gray", state: "variance" };
  return { label: "Configured", color: "green", state: "verified" };
}

export function SettingsView({ chrome }: { chrome: ViewChrome }) {
  const domain = useDomain();
  const [section, setSection] = useState<SectionKey>("thresholds");
  const [categoryTab, setCategoryTab] = useState<CategoryTab>("all");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [reason, setReason] = useState("");

  let org: Organization | null = null;
  let accessDenied = false;
  try {
    org = domain.store.getOrganization(domain.principal, domain.activeOrgId);
  } catch (err) {
    if (err instanceof CrossTenantNotFoundError) accessDenied = true;
    else throw err;
  }

  const shopName = org?.name ?? ORG_NAME_FALLBACK[domain.activeOrgId] ?? "This Shop";
  const shopShort = shortShopName(shopName);
  const timezone = org?.timezone ?? "America/Los_Angeles";
  const idleMinutes = org?.idle_timeout_minutes ?? 30;
  const isPlatformOwner = domain.principal.isPlatformOwner === true;

  const [form, setForm] = useState<SettingsFormState | null>(org ? emptySettingsForm(org) : null);
  // Re-sync the form from the store on any data change (including our own save).
  useEffect(() => {
    setForm(org ? emptySettingsForm(org) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain.activeOrgId, domain.version]);
  // Clear the save banner only when the Shop changes — NOT on every data
  // version bump, or the success banner our own save sets would be wiped out
  // immediately (the member-save banner in Team & Roles survives the same way).
  useEffect(() => {
    setMessage(null);
  }, [domain.activeOrgId]);

  const canConfigure = org ? domain.store.canConfigureShopSettings(domain.principal, domain.activeOrgId) : false;

  const visibleSections = SECTIONS.filter((s) => {
    if (categoryTab !== "all" && s.category !== categoryTab) return false;
    if (search.trim()) return s.label.toLowerCase().includes(search.trim().toLowerCase());
    return true;
  });
  const selected = visibleSections.find((s) => s.key === section) ?? visibleSections[0] ?? SECTIONS[0]!;

  useListNav(
    visibleSections.map((s) => s.key),
    selected.key,
    (key) => setSection(key as SectionKey),
  );

  const handleSave = () => {
    if (!org || !form) return;
    try {
      domain.mutate((s) =>
        s.updateOrgSettings(
          domain.principal,
          domain.activeOrgId,
          {
            timezone: form.timezone,
            toolIdPrefix: form.toolIdPrefix,
            dueSoonDays: form.dueSoonDays,
            weeklyDigestDay: form.weeklyDigestDay,
            weeklyDigestHour: form.weeklyDigestHour,
            weeklyDigestMinute: form.weeklyDigestMinute,
            missingToolThresholdDays: form.missingToolThresholdDays,
            staleAircraftDays: form.staleAircraftDays,
            idleTimeoutMinutes: form.idleTimeoutMinutes,
          },
          reason || null,
        ),
      );
      setMessage({ kind: "success", text: "Shop settings saved. Changes have been recorded in the compliance audit log." });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Could not save Shop settings." });
    }
  };

  const header = (
    <ContextHeaderBar
      title="Shop Settings"
      subtitle={shopLocationSuffix(shopName) ? `${shopShort} · ${shopLocationSuffix(shopName)}` : shopShort}
      activeView={chrome.activeView}
      onSelectView={chrome.onSelectView}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search settings…"
      primary={{ label: "+ Provision Shop", onClick: () => setSection("provisioning") }}
    />
  );

  const pill = sectionPill(selected.key, isPlatformOwner);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {header}
      <WorkspaceFilterBar
        scopeLabel={shopShort}
        scopeCount={`${SECTIONS.length}`}
        pills={[
          {
            label: "Section",
            value: selected.label,
            onClick: () => {
              const current = SECTIONS.find((s) => s.key === selected.key) ?? SECTIONS[0]!;
              setSection(cycleNext(SECTIONS, current).key);
              setCategoryTab("all");
            },
          },
        ]}
        rightCount={`${visibleSections.length} ${visibleSections.length === 1 ? "section" : "sections"}`}
      />

      <SplitBody
        list={
          <>
          <ListColumnHeader
            title="Shop Configuration & Security"
            metric={`${SECTIONS.length} ${SECTIONS.length === 1 ? "section" : "sections"}`}
            tabs={[
              { key: "all", label: `All (${SECTIONS.length})` },
              { key: "Configuration", label: "Config" },
              { key: "Security", label: "Security" },
            ]}
            activeTab={categoryTab}
            onSelectTab={(key) => setCategoryTab(key as CategoryTab)}
          />
          <ListScroll>
            {visibleSections.map((s) => {
              const p = sectionPill(s.key, isPlatformOwner);
              return (
                <ListRow
                  key={s.key}
                  selected={selected.key === s.key}
                  onClick={() => setSection(s.key)}
                  state={p.state}
                  line1={s.label}
                  line2={s.blurb}
                  pill={<StatusPill label={p.label} color={p.color} />}
                  subLabel={s.category}
                />
              );
            })}
            {visibleSections.length === 0 && <p className="px-4 py-6 text-sm text-[#667085]">No settings match this search.</p>}
          </ListScroll>
          </>
        }
        detail={
          <>
          <DetailScroll>
          <DetailTopBar
            breadcrumb={
              <>
                Shop Configuration › <span className="font-medium text-[#101828]">{selected.label}</span>
              </>
            }
            actions={<StatusPill label={pill.label} color={pill.color} />}
          />
          <DetailHeaderBlock
            icon={<selected.icon className="h-5 w-5 text-gray-700" />}
            title={selected.label}
            meta={
              <>
                <span className="font-medium text-[#344054]">{shopShort}</span>
                <span>·</span>
                <span>{selected.category}</span>
                <span>·</span>
                <span>{timezone}</span>
              </>
            }
          />

          <div className="px-7 pt-4">
            <MetadataGrid
              items={[
                { label: "Time zone", value: timezone },
                { label: "Tool ID prefix", value: <span className="font-mono tabular-nums">{org?.tool_id_prefix ?? "—"}</span> },
                { label: "Due-soon window", value: <span className="tabular-nums">{org ? `${org.due_soon_days} days` : "—"}</span> },
                { label: "Idle sign-out", value: <span className="tabular-nums">{idleMinutes} min</span> },
              ]}
            />
          </div>

          <div className="max-w-3xl flex-1 space-y-5 px-7 py-5">
            {message && (
              <div
                className={clsx(
                  "rounded-lg px-3.5 py-2.5 text-sm ring-1 ring-inset",
                  message.kind === "error" ? "bg-[#fef3f2] text-[#b42318] ring-[#fecdca]" : "bg-[#ecfdf3] text-[#067647] ring-[#abefc6]",
                )}
              >
                {message.text}
              </div>
            )}

            {(selected.key === "thresholds" || selected.key === "digest") &&
              (accessDenied || !org || !form ? (
                <p className="text-sm text-[#667085]">You are not an active Member of the selected Shop, so Shop settings are read-only here.</p>
              ) : (
                <ShopSettingsForm
                  form={form}
                  setForm={setForm as (updater: (prev: SettingsFormState) => SettingsFormState) => void}
                  canConfigure={canConfigure}
                  reason={reason}
                  setReason={setReason}
                  section={selected.key}
                />
              ))}

            {selected.key === "provisioning" && <ProvisioningPanel isPlatformOwner={isPlatformOwner} />}
            {selected.key === "rls" && <RlsMatrixPanel />}
          </div>
          </DetailScroll>

          <DetailFooter
            left={
              <>
                <div className="text-xs tabular-nums text-gray-500">
                  {org ? `Last updated ${org.updated_at.slice(0, 10)} · changes recorded to the audit log` : "Read-only"}
                </div>
                <div className="text-[11px] text-gray-400">J / K to navigate · ↵ save</div>
              </>
            }
          >
            <button
              type="button"
              disabled={!canConfigure || selected.key === "provisioning" || selected.key === "rls"}
              onClick={handleSave}
              className="uui-btn-primary h-9 rounded-md px-3.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save Shop settings
            </button>
          </DetailFooter>
          </>
        }
      />
    </div>
  );
}

function ShopSettingsForm({
  form,
  setForm,
  canConfigure,
  reason,
  setReason,
  section,
}: {
  form: SettingsFormState;
  setForm: (updater: (prev: SettingsFormState) => SettingsFormState) => void;
  canConfigure: boolean;
  reason: string;
  setReason: (value: string) => void;
  section: "thresholds" | "digest";
}) {
  return (
    <div className="space-y-5">
      {section === "thresholds" ? (
        <>
          <Field label="Time zone">
            {(id) => (
              <select
                id={id}
                value={form.timezone}
                disabled={!canConfigure}
                onChange={(e) => setForm((prev) => ({ ...prev, timezone: e.target.value }))}
                className="w-full rounded-lg border border-[#d0d5dd] bg-white px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155eef] disabled:bg-[#f9fafb]"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Tool ID prefix">
            {(id) => (
              <input
                id={id}
                type="text"
                value={form.toolIdPrefix}
                disabled={!canConfigure}
                onChange={(e) => setForm((prev) => ({ ...prev, toolIdPrefix: e.target.value }))}
                className="w-full rounded-lg border border-[#d0d5dd] px-3 py-2 font-mono text-sm tabular-nums shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155eef] disabled:bg-[#f9fafb]"
              />
            )}
          </Field>
          <Field label="Calibration due-soon window (days)">
            {(id) => (
              <NumberInput id={id} value={form.dueSoonDays} disabled={!canConfigure} min={1} max={365} onChange={(v) => setForm((p) => ({ ...p, dueSoonDays: v }))} />
            )}
          </Field>
          <Field label="Missing-tool alert threshold (days)">
            {(id) => (
              <NumberInput id={id} value={form.missingToolThresholdDays} disabled={!canConfigure} min={1} max={3650} onChange={(v) => setForm((p) => ({ ...p, missingToolThresholdDays: v }))} />
            )}
          </Field>
          <Field label="Stale aircraft time threshold (days)">
            {(id) => (
              <NumberInput id={id} value={form.staleAircraftDays} disabled={!canConfigure} min={1} max={3650} onChange={(v) => setForm((p) => ({ ...p, staleAircraftDays: v }))} />
            )}
          </Field>
        </>
      ) : (
        <>
          <Field label="Weekly digest schedule (Shop-local time)">
            {(id) => (
              <div className="flex gap-2">
                <select
                  id={id}
                  value={form.weeklyDigestDay}
                  disabled={!canConfigure}
                  onChange={(e) => setForm((prev) => ({ ...prev, weeklyDigestDay: Number(e.target.value) }))}
                  className="flex-1 rounded-lg border border-[#d0d5dd] bg-white px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155eef] disabled:bg-[#f9fafb]"
                >
                  {WEEKDAYS.map((day, idx) => (
                    <option key={day} value={idx}>
                      {day}
                    </option>
                  ))}
                </select>
                <NumberInput value={form.weeklyDigestHour} disabled={!canConfigure} min={0} max={23} onChange={(v) => setForm((p) => ({ ...p, weeklyDigestHour: v }))} className="w-20" />
                <NumberInput value={form.weeklyDigestMinute} disabled={!canConfigure} min={0} max={59} onChange={(v) => setForm((p) => ({ ...p, weeklyDigestMinute: v }))} className="w-20" />
              </div>
            )}
          </Field>
          <Field label="Idle session sign-out timeout (minutes)">
            {(id) => (
              <NumberInput id={id} value={form.idleTimeoutMinutes} disabled={!canConfigure} min={5} max={480} onChange={(v) => setForm((p) => ({ ...p, idleTimeoutMinutes: v }))} className="w-28" />
            )}
          </Field>
        </>
      )}

      <Field label="Reason (recorded to audit log)">
        {(id) => (
          <input
            id={id}
            type="text"
            value={reason}
            disabled={!canConfigure}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Aligning due-soon window with insurer requirement"
            className="w-full rounded-lg border border-[#d0d5dd] px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155eef] disabled:bg-[#f9fafb]"
          />
        )}
      </Field>
    </div>
  );
}

function ProvisioningPanel({ isPlatformOwner }: { isPlatformOwner: boolean }) {
  const domain = useDomain();
  const [shopName, setShopName] = useState("Pacific Rotorcraft Maintenance");
  const [slug, setSlug] = useState("org-pacific-rotorcraft");
  const [adminEmail, setAdminEmail] = useState("admin@pacificrotorcraft.example");
  const [adminFullName, setAdminFullName] = useState("Priya Nakamura");
  const [receipt, setReceipt] = useState<ProvisionShopReceipt | null>(null);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProvision = () => {
    try {
      const result = domain.mutate((s) => s.provisionShopAsPlatformOwner(domain.principal, { name: shopName, slug, adminEmail, adminFullName }));
      setReceipt(result);
      setVerifyResult(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not provision Shop.");
    }
  };

  const handleVerifyZeroAccess = () => {
    if (!receipt) return;
    try {
      domain.store.listMembers(domain.principal, receipt.org_id);
      setVerifyResult("Unexpected: the Platform Owner could read the new Shop's roster. Shop isolation is broken.");
    } catch (err) {
      if (err instanceof CrossTenantNotFoundError) {
        setVerifyResult("Confirmed: the Platform Owner has zero read access to the new Shop's roster unless its Admin invites them.");
      } else {
        setVerifyResult(err instanceof Error ? err.message : "Unexpected error.");
      }
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#667085]">
        Provisioning a new Shop creates its workspace and invites the initial Admin, without adding the Platform Owner to the new Shop's
        roster. The Platform Owner cannot view the new Shop's team, settings, or history unless its Admin invites them.
      </p>
      {!isPlatformOwner && (
        <div className="rounded-lg bg-[#fffaeb] px-3.5 py-2.5 text-sm text-[#93370d] ring-1 ring-inset ring-[#fedf89]">
          Only a Platform Owner can provision a new Shop.
        </div>
      )}
      {error && <div className="rounded-lg bg-[#fef3f2] px-3.5 py-2.5 text-sm text-[#b42318] ring-1 ring-inset ring-[#fecdca]">{error}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Shop name">
          {(id) => <TextInput id={id} value={shopName} disabled={!isPlatformOwner} onChange={setShopName} />}
        </Field>
        <Field label="Shop reference">
          {(id) => <TextInput id={id} value={slug} disabled={!isPlatformOwner} onChange={setSlug} mono />}
        </Field>
        <Field label="Initial Admin full name">
          {(id) => <TextInput id={id} value={adminFullName} disabled={!isPlatformOwner} onChange={setAdminFullName} />}
        </Field>
        <Field label="Initial Admin email">
          {(id) => <TextInput id={id} value={adminEmail} disabled={!isPlatformOwner} onChange={setAdminEmail} type="email" />}
        </Field>
      </div>

      <button
        type="button"
        disabled={!isPlatformOwner}
        onClick={handleProvision}
        className="uui-btn-primary rounded-lg px-3.5 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
      >
        Provision Shop
      </button>

      {receipt && (
        <div className="rounded-lg bg-white p-4 shadow-xs ring-1 ring-inset ring-[#e4e7ec]">
          <p className="text-sm font-semibold text-[#101828]">Provisioning receipt</p>
          <dl className="mt-2 space-y-1 text-sm">
            <ReceiptRow label="Shop reference" value={<span className="font-mono tabular-nums">{receipt.org_id}</span>} />
            <ReceiptRow label="Shop name" value={receipt.shop_name} />
            <ReceiptRow label="Initial Admin" value={receipt.initial_admin_email} />
            <ReceiptRow label="Invite status" value={<StatusPill label="Invited" color="blue" />} />
          </dl>
          <button type="button" onClick={handleVerifyZeroAccess} className="uui-btn-secondary mt-3 rounded-lg px-3 py-2 text-sm font-medium">
            Verify zero read access
          </button>
          {verifyResult && <p className="mt-2 text-sm text-[#344054]">{verifyResult}</p>}
        </div>
      )}
    </div>
  );
}

function RlsMatrixPanel() {
  const rows = [
    { area: "Shop Settings", view: "Active Shop members", change: "Shop Admins only" },
    { area: "Team & Roles", view: "Active Shop members", change: "Shop Admins only" },
    { area: "Compliance Audit Log", view: "Shop Admins and Inspectors", change: "Locked after creation — entries cannot be edited or removed" },
    { area: "Certificates & Attachments", view: "Active Shop members", change: "Active Shop members can upload; only Shop Admins and Inspectors can overwrite or delete" },
  ];
  return (
    <div>
      <p className="inline-flex items-center gap-1.5 text-sm font-medium text-[#101828]">
        <ShieldCheck className="h-4 w-4 text-[#17b26a]" />
        Every Shop's data is fully isolated from every other Shop
      </p>
      <p className="mt-1 text-sm text-[#667085]">This matrix shows who can view and who can change each area within a Shop.</p>
      <div className="mt-4 overflow-hidden rounded-xl bg-white shadow-xs ring-1 ring-inset ring-[#e4e7ec]">
        <div className="grid grid-cols-3 gap-3 bg-[#f9fafb]/70 px-4 py-2.5 text-xs font-medium text-[#667085]">
          <span>Area</span>
          <span>Who can view</span>
          <span>Who can change</span>
        </div>
        {rows.map((row) => (
          <div key={row.area} className="grid grid-cols-3 gap-3 border-t border-[#e4e7ec] px-4 py-3 text-sm">
            <span className="font-medium text-[#101828]">{row.area}</span>
            <span className="text-[#344054]">{row.view}</span>
            <span className="text-[#344054]">{row.change}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: (id: string) => React.ReactNode }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-[#344054]">
        {label}
      </label>
      {children(id)}
    </div>
  );
}

function NumberInput({
  id,
  value,
  onChange,
  disabled,
  min,
  max,
  className,
}: {
  id?: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  className?: string;
}) {
  return (
    <input
      id={id}
      type="number"
      value={value}
      min={min}
      max={max}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className={clsx(
        "rounded-lg border border-[#d0d5dd] px-3 py-2 text-sm tabular-nums shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155eef] disabled:bg-[#f9fafb]",
        className ?? "w-full",
      )}
    />
  );
}

function TextInput({
  id,
  value,
  onChange,
  disabled,
  type = "text",
  mono,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  type?: string;
  mono?: boolean;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={clsx(
        "w-full rounded-lg border border-[#d0d5dd] px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155eef] disabled:bg-[#f9fafb]",
        mono && "font-mono tabular-nums",
      )}
    />
  );
}

function ReceiptRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[#667085]">{label}</dt>
      <dd className="text-[#101828]">{value}</dd>
    </div>
  );
}
