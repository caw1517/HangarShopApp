"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { useDomain } from "@/lib/domain/context";
import { CrossTenantNotFoundError } from "@/lib/domain/errors";
import type { Organization, ProvisionShopReceipt } from "@/lib/domain/types";
import { StatusPill, type StatusDotColor } from "@/components/primitives/StatusPill";
import { SplitViewWorkspace } from "@/components/primitives/SplitViewWorkspace";

type SectionKey = "thresholds" | "digest" | "provisioning" | "rls";

const SECTIONS: Array<{ key: SectionKey; label: string }> = [
  { key: "thresholds", label: "Shop Compliance Thresholds" },
  { key: "digest", label: "Weekly Digest & Idle Timeout" },
  { key: "provisioning", label: "New Shop Provisioning" },
  { key: "rls", label: "Shop Isolation & Data Security" },
];

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const TIMEZONES = ["America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York", "America/Anchorage"];

type SettingsFormState = ReturnType<typeof emptySettingsForm>;

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

export function SettingsView() {
  const domain = useDomain();
  const [section, setSection] = useState<SectionKey>("thresholds");
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

  const [form, setForm] = useState(org ? emptySettingsForm(org) : null);

  useEffect(() => {
    setForm(org ? emptySettingsForm(org) : null);
    setMessage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain.activeOrgId, domain.version]);

  const canConfigure = org ? domain.store.canConfigureShopSettings(domain.principal, domain.activeOrgId) : false;

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

  return (
    <SplitViewWorkspace>
      <div className="flex h-full flex-col">
        <div className="border-b border-[#e4e7ec] bg-white px-4 py-3">
          <h2 className="text-sm font-semibold text-[#101828]">Configuration & tenancy</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {SECTIONS.map((s) => {
            const isActive = section === s.key;
            let pill: { label: string; color: StatusDotColor } = { label: "Configured", color: "green" };
            if (s.key === "provisioning") {
              pill = domain.principal.isPlatformOwner
                ? { label: "Available", color: "blue" }
                : { label: "Platform Owner only", color: "gray" };
            }
            if (s.key === "rls") pill = { label: "Enforced", color: "green" };
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSection(s.key)}
                className={clsx(
                  "flex w-full items-center justify-between gap-3 border-b border-[#e4e7ec] px-4 py-3 text-left last:border-b-0 hover:bg-[#f9fafb]",
                  isActive && "bg-[#f2f4f7]/90",
                )}
              >
                <span className={clsx("text-sm", isActive ? "font-semibold text-[#101828]" : "font-medium text-[#101828]")}>{s.label}</span>
                <StatusPill label={pill.label} color={pill.color} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-full overflow-y-auto p-6">
        {message && (
          <div
            className={clsx(
              "mb-4 rounded-lg px-3.5 py-2.5 text-sm ring-1 ring-inset",
              message.kind === "error" ? "bg-[#fef3f2] text-[#b42318] ring-[#fecdca]" : "bg-[#ecfdf3] text-[#067647] ring-[#abefc6]",
            )}
          >
            {message.text}
          </div>
        )}

        {section === "thresholds" &&
          (accessDenied || !org || !form ? (
            <p className="text-sm text-[#667085]">This persona is not an active Member of the selected Shop.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <SettingsCard title="Per-Shop Settings">
                <ShopSettingsForm
                  form={form}
                  setForm={setForm as (updater: (prev: SettingsFormState) => SettingsFormState) => void}
                  canConfigure={canConfigure}
                  reason={reason}
                  setReason={setReason}
                  onSave={handleSave}
                />
              </SettingsCard>
              <SettingsCard title="New Shop Provisioning">
                <ProvisioningCard />
              </SettingsCard>
            </div>
          ))}

        {section === "digest" &&
          (accessDenied || !org || !form ? (
            <p className="text-sm text-[#667085]">This persona is not an active Member of the selected Shop.</p>
          ) : (
            <div className="max-w-lg">
              <ShopSettingsForm
                form={form}
                setForm={setForm as (updater: (prev: SettingsFormState) => SettingsFormState) => void}
                canConfigure={canConfigure}
                reason={reason}
                setReason={setReason}
                onSave={handleSave}
              />
            </div>
          ))}

        {section === "provisioning" && <ProvisioningCard />}

        {section === "rls" && <RlsMatrixPanel />}
      </div>
    </SplitViewWorkspace>
  );
}

function ShopSettingsForm({
  form,
  setForm,
  canConfigure,
  reason,
  setReason,
  onSave,
}: {
  form: NonNullable<ReturnType<typeof emptySettingsForm>>;
  setForm: (updater: (prev: typeof form) => typeof form) => void;
  canConfigure: boolean;
  reason: string;
  setReason: (value: string) => void;
  onSave: () => void;
}) {
  const domain = useDomain();
  return (
    <div className="space-y-5">
      <Field label="Time zone">
        <select
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
      </Field>

      <Field label="Tool ID prefix">
        <input
          type="text"
          value={form.toolIdPrefix}
          disabled={!canConfigure}
          onChange={(e) => setForm((prev) => ({ ...prev, toolIdPrefix: e.target.value }))}
          className="w-full rounded-lg border border-[#d0d5dd] px-3 py-2 font-mono text-sm tabular-nums shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155eef] disabled:bg-[#f9fafb]"
        />
      </Field>

      <Field label="Calibration due-soon window (days)">
        <input
          type="number"
          min={1}
          max={365}
          value={form.dueSoonDays}
          disabled={!canConfigure}
          onChange={(e) => setForm((prev) => ({ ...prev, dueSoonDays: Number(e.target.value) }))}
          className="w-full rounded-lg border border-[#d0d5dd] px-3 py-2 text-sm tabular-nums shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155eef] disabled:bg-[#f9fafb]"
        />
      </Field>

      <Field label="Weekly digest schedule (Shop-local time)">
        <div className="flex gap-2">
          <select
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
          <input
            type="number"
            min={0}
            max={23}
            value={form.weeklyDigestHour}
            disabled={!canConfigure}
            onChange={(e) => setForm((prev) => ({ ...prev, weeklyDigestHour: Number(e.target.value) }))}
            className="w-20 rounded-lg border border-[#d0d5dd] px-3 py-2 text-sm tabular-nums shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155eef] disabled:bg-[#f9fafb]"
          />
          <input
            type="number"
            min={0}
            max={59}
            value={form.weeklyDigestMinute}
            disabled={!canConfigure}
            onChange={(e) => setForm((prev) => ({ ...prev, weeklyDigestMinute: Number(e.target.value) }))}
            className="w-20 rounded-lg border border-[#d0d5dd] px-3 py-2 text-sm tabular-nums shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155eef] disabled:bg-[#f9fafb]"
          />
        </div>
      </Field>

      <Field label="Missing-tool alert threshold (days)">
        <input
          type="number"
          min={1}
          value={form.missingToolThresholdDays}
          disabled={!canConfigure}
          onChange={(e) => setForm((prev) => ({ ...prev, missingToolThresholdDays: Number(e.target.value) }))}
          className="w-full rounded-lg border border-[#d0d5dd] px-3 py-2 text-sm tabular-nums shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155eef] disabled:bg-[#f9fafb]"
        />
      </Field>

      <Field label="Stale aircraft time threshold (days)">
        <input
          type="number"
          min={1}
          value={form.staleAircraftDays}
          disabled={!canConfigure}
          onChange={(e) => setForm((prev) => ({ ...prev, staleAircraftDays: Number(e.target.value) }))}
          className="w-full rounded-lg border border-[#d0d5dd] px-3 py-2 text-sm tabular-nums shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155eef] disabled:bg-[#f9fafb]"
        />
      </Field>

      <Field label="Idle session sign-out timeout (minutes)">
        <div className="flex items-center gap-2.5">
          <input
            type="number"
            min={5}
            max={480}
            value={form.idleTimeoutMinutes}
            disabled={!canConfigure}
            onChange={(e) => setForm((prev) => ({ ...prev, idleTimeoutMinutes: Number(e.target.value) }))}
            className="w-28 rounded-lg border border-[#d0d5dd] px-3 py-2 text-sm tabular-nums shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155eef] disabled:bg-[#f9fafb]"
          />
          <button type="button" onClick={domain.idlePreviewWarning} className="uui-btn-secondary rounded-lg px-3 py-2 text-sm font-medium">
            Preview idle timeout warning
          </button>
        </div>
      </Field>

      <Field label="Reason (recorded to audit log)">
        <input
          type="text"
          value={reason}
          disabled={!canConfigure}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Aligning due-soon window with insurer requirement"
          className="w-full rounded-lg border border-[#d0d5dd] px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155eef] disabled:bg-[#f9fafb]"
        />
      </Field>

      <button type="button" disabled={!canConfigure} onClick={onSave} className="uui-btn-primary rounded-lg px-3.5 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50">
        Save Shop settings
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[#344054]">{label}</label>
      {children}
    </div>
  );
}

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-xs ring-1 ring-inset ring-[#e4e7ec]">
      <h3 className="mb-4 text-sm font-semibold text-[#101828]">{title}</h3>
      {children}
    </div>
  );
}

function ProvisioningCard() {
  const domain = useDomain();
  const [shopName, setShopName] = useState("Pacific Rotorcraft Maintenance");
  const [slug, setSlug] = useState("org-pacific-rotorcraft");
  const [adminEmail, setAdminEmail] = useState("admin@pacificrotorcraft.example");
  const [adminFullName, setAdminFullName] = useState("Priya Nakamura");
  const [receipt, setReceipt] = useState<ProvisionShopReceipt | null>(null);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPlatformOwner = domain.principal.isPlatformOwner === true;

  const handleProvision = () => {
    try {
      const result = domain.mutate((s) =>
        s.provisionShopAsPlatformOwner(domain.principal, { name: shopName, slug, adminEmail, adminFullName }),
      );
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
      setVerifyResult("Unexpected: Platform Owner could read the new Shop's team roster. Shop isolation is broken.");
    } catch (err) {
      if (err instanceof CrossTenantNotFoundError) {
        setVerifyResult("Confirmed: Platform Owner has zero read access to the new Shop's team roster.");
      } else {
        setVerifyResult(err instanceof Error ? err.message : "Unexpected error.");
      }
    }
  };

  return (
    <div className="max-w-lg space-y-4">
      <p className="text-sm text-[#667085]">
        Provisioning a new Shop creates its workspace and invites the initial Admin, without adding the Platform
        Owner to the Shop roster. That means the Platform Owner cannot view the new Shop's team, settings, or audit
        history unless the Shop Admin invites them.
      </p>
      {!isPlatformOwner && (
        <div className="rounded-lg bg-[#fffaeb] px-3.5 py-2.5 text-sm text-[#93370d] ring-1 ring-inset ring-[#fedf89]">
          Open the &quot;Tweaks&quot; pill in the bottom-right corner to switch to Platform Owner.
        </div>
      )}
      {error && <div className="rounded-lg bg-[#fef3f2] px-3.5 py-2.5 text-sm text-[#b42318] ring-1 ring-inset ring-[#fecdca]">{error}</div>}

      <Field label="Shop name">
        <input
          type="text"
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          disabled={!isPlatformOwner}
          className="w-full rounded-lg border border-[#d0d5dd] px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155eef] disabled:bg-[#f9fafb]"
        />
      </Field>
      <Field label="Shop slug">
        <input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          disabled={!isPlatformOwner}
          className="w-full rounded-lg border border-[#d0d5dd] px-3 py-2 font-mono text-sm tabular-nums shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155eef] disabled:bg-[#f9fafb]"
        />
      </Field>
      <Field label="Initial Admin full name">
        <input
          type="text"
          value={adminFullName}
          onChange={(e) => setAdminFullName(e.target.value)}
          disabled={!isPlatformOwner}
          className="w-full rounded-lg border border-[#d0d5dd] px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155eef] disabled:bg-[#f9fafb]"
        />
      </Field>
      <Field label="Initial Admin email">
        <input
          type="email"
          value={adminEmail}
          onChange={(e) => setAdminEmail(e.target.value)}
          disabled={!isPlatformOwner}
          className="w-full rounded-lg border border-[#d0d5dd] px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155eef] disabled:bg-[#f9fafb]"
        />
      </Field>

      <button type="button" disabled={!isPlatformOwner} onClick={handleProvision} className="uui-btn-primary rounded-lg px-3.5 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50">
        Provision Shop (blind)
      </button>

      {receipt && (
        <div className="rounded-lg bg-white p-4 shadow-xs ring-1 ring-inset ring-[#e4e7ec]">
          <p className="text-sm font-semibold text-[#101828]">Provisioning receipt</p>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[#667085]">Shop ID</dt>
              <dd className="font-mono tabular-nums text-[#101828]">{receipt.org_id}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#667085]">Shop name</dt>
              <dd className="text-[#101828]">{receipt.shop_name}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#667085]">Initial Admin</dt>
              <dd className="text-[#101828]">{receipt.initial_admin_email}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#667085]">Invite status</dt>
              <dd>
                <StatusPill label={receipt.invite_status} color="blue" />
              </dd>
            </div>
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
    { area: "Shop Settings", select: "Active shop members", write: "Shop Admins only" },
    { area: "Team & Roles", select: "Active shop members", write: "Shop Admins only" },
    { area: "Compliance Audit Log", select: "Shop Admins and Inspectors", write: "Locked after creation — entries cannot be edited or removed" },
    { area: "Certificates & Attachments", select: "Active shop members", write: "Active shop members" },
  ];
  return (
    <div className="max-w-2xl">
      <p className="text-sm text-[#667085]">
        Every Shop's data is fully isolated from every other Shop. This matrix shows who can view and who can change
        each area within a Shop.
      </p>
      <div className="mt-4 overflow-hidden rounded-xl bg-white shadow-xs ring-1 ring-inset ring-[#e4e7ec]">
        <div className="grid grid-cols-3 gap-3 bg-[#f9fafb]/70 px-4 py-2.5 text-xs font-medium text-[#667085]">
          <span>Area</span>
          <span>Who can view</span>
          <span>Who can change</span>
        </div>
        {rows.map((row) => (
          <div key={row.area} className="grid grid-cols-3 gap-3 border-t border-[#e4e7ec] px-4 py-3 text-sm">
            <span className="font-medium text-[#101828]">{row.area}</span>
            <span className="text-[#344054]">{row.select}</span>
            <span className="text-[#344054]">{row.write}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
