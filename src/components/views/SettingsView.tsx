"use client";

import { useEffect, useId, useState } from "react";
import { clsx } from "clsx";
import { useDomain } from "@/lib/domain/context";
import { CrossTenantNotFoundError } from "@/lib/domain/errors";
import { ORG_APEX_ID } from "@/lib/domain/seed";
import { VALID_TIMEZONES, validateOrgSettings } from "@/lib/domain/settings-validation";
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
  { key: "thresholds", label: "Compliance thresholds", blurb: "Due-soon, missing-tool & stale windows", category: "Configuration", icon: SettingsIcon },
  { key: "digest", label: "Weekly digest & idle sign-out", blurb: "Scheduled summary and idle sign-out", category: "Configuration", icon: SettingsIcon },
  { key: "provisioning", label: "New shop provisioning", blurb: "Create a new Shop and invite its first Admin", category: "Security", icon: Building },
  { key: "rls", label: "Who can view and change each area", blurb: "Access by role in this shop", category: "Security", icon: Lock },
];

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIMEZONES = VALID_TIMEZONES;
const CATEGORY_CYCLE = ["all", "Configuration", "Security"] as const;
type CategoryTab = (typeof CATEGORY_CYCLE)[number];

const ORG_NAME_FALLBACK: Record<string, string> = {
  [ORG_APEX_ID]: "Apex Charter MX · Hangar 1",
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
  // Re-sync the form from the store on any data change (including our own save),
  // but leave `message` alone so the success banner our save sets survives the
  // version bump (the member-save banner in Team & Roles survives the same way).
  useEffect(() => {
    setForm(org ? emptySettingsForm(org) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain.activeOrgId, domain.version]);

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

  // Changing section (or Shop) is a fresh context: clear any banner and reset
  // the draft + reason so a message or a bad value from one section never
  // bleeds into another (a read-only section must show no save banner, and a
  // bad value here must never block Save or show an error on a field off-screen).
  useEffect(() => {
    setMessage(null);
    setForm(org ? emptySettingsForm(org) : null);
    setReason("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain.activeOrgId, selected.key]);

  // Whether the draft differs from the saved Shop — Save stays disabled (and a
  // no-op save is skipped) until something in the editable form actually changes.
  const formDirty =
    !!org &&
    !!form &&
    (form.timezone !== org.timezone ||
      form.toolIdPrefix !== org.tool_id_prefix ||
      form.dueSoonDays !== org.due_soon_days ||
      form.weeklyDigestDay !== org.weekly_digest_day ||
      form.weeklyDigestHour !== org.weekly_digest_hour ||
      form.weeklyDigestMinute !== org.weekly_digest_minute ||
      form.missingToolThresholdDays !== org.missing_tool_threshold_days ||
      form.staleAircraftDays !== org.stale_aircraft_days ||
      form.idleTimeoutMinutes !== org.idle_timeout_minutes);

  // Recompute the validation message live from the current draft (same rules as
  // the store and the DB CHECKs). Because a section/Shop change resets the draft
  // to the saved row, only the fields the user actually edited in THIS section
  // can be invalid, so this stays per-section scoped. Save requires dirty && valid.
  const validationError = form ? validateOrgSettings(form) : null;

  // Any user edit clears a stale post-save banner (a fixed value must not leave
  // the old error on screen). The store re-sync after a save calls setForm/set
  // Message directly, not these, so the success banner still survives the bump.
  const editForm = (updater: (prev: SettingsFormState) => SettingsFormState) => {
    setForm((prev) => (prev ? updater(prev) : prev));
    setMessage(null);
  };
  const editReason = (value: string) => {
    setReason(value);
    setMessage(null);
  };

  const banner: { kind: "error" | "success"; text: string } | null = validationError
    ? { kind: "error", text: validationError }
    : message;

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
            {visibleSections.length === 0 && <p className="px-4 py-6 text-sm text-slate-600">No settings match this search.</p>}
          </ListScroll>
          </>
        }
        detail={
          <>
          <DetailScroll>
          <DetailTopBar
            breadcrumb={
              <>
                Shop Configuration › <span className="font-medium text-slate-900">{selected.label}</span>
              </>
            }
            actions={<StatusPill label={pill.label} color={pill.color} />}
          />
          <DetailHeaderBlock
            icon={<selected.icon className="h-5 w-5 text-slate-700" />}
            title={selected.label}
            meta={
              <>
                <span className="font-medium text-slate-700">{shopShort}</span>
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
                { label: "Tool ID prefix", value: <span className="font-mono tabular-nums">{org?.tool_id_prefix ?? "Not set"}</span> },
                { label: "Due-soon window", value: <span className="tabular-nums">{org ? `${org.due_soon_days} days` : "Not set"}</span> },
                { label: "Idle sign-out", value: <span className="tabular-nums">{idleMinutes} min</span> },
              ]}
            />
          </div>

          <div className="max-w-3xl flex-1 space-y-5 px-7 py-5">
            {banner && (selected.key === "thresholds" || selected.key === "digest") && (
              <div
                className={clsx(
                  "rounded-sm px-3.5 py-2.5 text-sm ring-1 ring-inset",
                  banner.kind === "error" ? "bg-error-tint text-error ring-error/25" : "bg-success-tint text-success ring-success/25",
                )}
              >
                {banner.text}
              </div>
            )}

            {(selected.key === "thresholds" || selected.key === "digest") &&
              (accessDenied || !org || !form ? (
                <p className="text-sm text-slate-600">You are not an active Member of the selected Shop, so Shop settings are read-only here.</p>
              ) : (
                <ShopSettingsForm
                  form={form}
                  setForm={editForm}
                  canConfigure={canConfigure}
                  reason={reason}
                  setReason={editReason}
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
                <div className="text-xs tabular-nums text-slate-600">
                  {org ? `Last updated ${org.updated_at.slice(0, 10)} · changes recorded to the audit log` : "Read-only"}
                </div>
              </>
            }
          >
            <button
              type="button"
              disabled={!canConfigure || selected.key === "provisioning" || selected.key === "rls" || !formDirty || !!validationError}
              onClick={handleSave}
              className="uui-btn-primary h-9 rounded-sm px-3.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
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
                className="w-full rounded-sm border border-slate-500 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-ring disabled:bg-slate-100"
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
                className="w-full rounded-sm border border-slate-500 px-3 py-2 font-mono text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-accent-ring disabled:bg-slate-100"
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
                  className="flex-1 rounded-sm border border-slate-500 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-ring disabled:bg-slate-100"
                >
                  {WEEKDAYS.map((day, idx) => (
                    <option key={day} value={idx}>
                      {day}
                    </option>
                  ))}
                </select>
                <NumberInput ariaLabel="Weekly digest hour (0–23)" value={form.weeklyDigestHour} disabled={!canConfigure} min={0} max={23} onChange={(v) => setForm((p) => ({ ...p, weeklyDigestHour: v }))} className="w-20" />
                <NumberInput ariaLabel="Weekly digest minute (0–59)" value={form.weeklyDigestMinute} disabled={!canConfigure} min={0} max={59} onChange={(v) => setForm((p) => ({ ...p, weeklyDigestMinute: v }))} className="w-20" />
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
            className="w-full rounded-sm border border-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-ring disabled:bg-slate-100"
          />
        )}
      </Field>
    </div>
  );
}

function ProvisioningPanel({ isPlatformOwner }: { isPlatformOwner: boolean }) {
  const domain = useDomain();
  const [shopName, setShopName] = useState("");
  const [slug, setSlug] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminFullName, setAdminFullName] = useState("");
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
      setVerifyResult("Unexpected: the Platform Owner could read the new Shop's roster. Access should stay blocked until its Admin sends an invite.");
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
      <p className="text-sm text-slate-600">
        Provisioning a new Shop creates its workspace and invites the initial Admin, without adding the Platform Owner to the new Shop's
        roster. The Platform Owner cannot view the new Shop's team, settings, or history unless its Admin invites them.
      </p>
      {!isPlatformOwner && (
        <div className="rounded-sm bg-warning-tint px-3.5 py-2.5 text-sm text-warning ring-1 ring-inset ring-warning/25">
          Only a Platform Owner can provision a new Shop.
        </div>
      )}
      {error && <div className="rounded-sm bg-error-tint px-3.5 py-2.5 text-sm text-error ring-1 ring-inset ring-error/25">{error}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Shop name">
          {(id) => <TextInput id={id} value={shopName} disabled={!isPlatformOwner} onChange={setShopName} placeholder="New Shop name" />}
        </Field>
        <Field label="Shop reference">
          {(id) => <TextInput id={id} value={slug} disabled={!isPlatformOwner} onChange={setSlug} mono placeholder="org-reference" />}
        </Field>
        <Field label="Initial Admin full name">
          {(id) => <TextInput id={id} value={adminFullName} disabled={!isPlatformOwner} onChange={setAdminFullName} placeholder="Full name" />}
        </Field>
        <Field label="Initial Admin email">
          {(id) => <TextInput id={id} value={adminEmail} disabled={!isPlatformOwner} onChange={setAdminEmail} type="email" placeholder="name@shop.example" />}
        </Field>
      </div>

      <button
        type="button"
        disabled={!isPlatformOwner || !shopName.trim() || !slug.trim() || !adminFullName.trim() || !adminEmail.trim()}
        onClick={handleProvision}
        className="uui-btn-primary rounded-sm px-3.5 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
      >
        Provision Shop
      </button>

      {receipt && (
        <div className="rounded-sm bg-white p-4 ring-1 ring-inset ring-slate-200">
          <p className="text-sm font-semibold text-slate-900">Provisioning receipt</p>
          <dl className="mt-2 space-y-1 text-sm">
            <ReceiptRow label="Shop reference" value={<span className="font-mono tabular-nums">{receipt.org_id}</span>} />
            <ReceiptRow label="Shop name" value={receipt.shop_name} />
            <ReceiptRow label="Initial Admin" value={receipt.initial_admin_email} />
            <ReceiptRow label="Invite status" value={<StatusPill label="Invited" color="blue" />} />
          </dl>
          <button type="button" onClick={handleVerifyZeroAccess} className="uui-btn-secondary mt-3 rounded-sm px-3 py-2 text-sm font-medium">
            Verify zero read access
          </button>
          {verifyResult && <p className="mt-2 text-sm text-slate-700">{verifyResult}</p>}
        </div>
      )}
    </div>
  );
}

function RlsMatrixPanel() {
  const rows = [
    { area: "Shop Settings", view: "Active Shop members", change: "Shop Admins only" },
    { area: "Team & Roles", view: "Active Shop members", change: "Shop Admins only" },
    { area: "Compliance Audit Log", view: "Shop Admins and Inspectors", change: "No one. Entries can't be edited or removed" },
    { area: "Certificates & Attachments", view: "Active Shop members", change: "Active Shop members can upload; only Shop Admins and Inspectors can overwrite or delete" },
  ];
  return (
    <div>
      <p className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-900">
        <ShieldCheck className="h-4 w-4 text-success-dot" />
        Only members of this shop can see its records
      </p>
      <p className="mt-1 text-sm text-slate-600">This matrix shows who can view and who can change each area within a Shop.</p>
      <div className="mt-4 overflow-hidden bg-white ring-1 ring-inset ring-slate-200">
        <div className="grid grid-cols-3 gap-3 bg-slate-50/70 px-4 py-2.5 text-xs font-medium text-slate-600">
          <span>Area</span>
          <span>Who can view</span>
          <span>Who can change</span>
        </div>
        {rows.map((row) => (
          <div key={row.area} className="grid grid-cols-3 gap-3 border-t border-slate-200 px-4 py-3 text-sm">
            <span className="font-medium text-slate-900">{row.area}</span>
            <span className="text-slate-700">{row.view}</span>
            <span className="text-slate-700">{row.change}</span>
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
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
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
  ariaLabel,
}: {
  id?: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  min?: number;
  max?: number;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <input
      id={id}
      type="number"
      aria-label={ariaLabel}
      value={value}
      min={min}
      max={max}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className={clsx(
        "rounded-sm border border-slate-500 px-3 py-2 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-accent-ring disabled:bg-slate-100",
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
  placeholder,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  type?: string;
  mono?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={clsx(
        "w-full rounded-sm border border-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-ring disabled:bg-slate-100",
        mono && "font-mono tabular-nums",
      )}
    />
  );
}

function ReceiptRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-600">{label}</dt>
      <dd className="text-slate-900">{value}</dd>
    </div>
  );
}
