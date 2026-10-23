"use client";

import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { useDomain } from "@/lib/domain/context";
import { CrossTenantNotFoundError, LastAdminGuardError, NotAuthorizedError } from "@/lib/domain/errors";
import type { OrgMembership, Role } from "@/lib/domain/types";
import { cycleNext, initials, shopLocationSuffix, shortShopName } from "@/lib/ui-utils";
import { useListNav } from "@/lib/use-list-nav";
import type { ViewChrome } from "@/components/AppRoot";
import { StatusPill, type StatusDotColor } from "@/components/primitives/StatusPill";
import {
  AccessDeniedPanel,
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
  type VerificationState,
} from "@/components/primitives/WorkspaceShell";

type StatusTab = "all" | "active" | "invited";

const ROLE_OPTIONS: Array<{ value: Role; label: string; description: string }> = [
  { value: "admin", label: "Admin", description: "Full Shop management, settings, and team control" },
  { value: "inspector", label: "Inspector", description: "Read the audit log, verify compliance work" },
  { value: "mechanic", label: "Mechanic", description: "Day-to-day tool and consumable usage" },
];

const ROLE_CYCLE: Array<Role | "ALL"> = ["ALL", "admin", "inspector", "mechanic"];
const DESIGNATION_CYCLE = ["ALL", "cal", "auditor"] as const;
type Designation = (typeof DESIGNATION_CYCLE)[number];

function statusPillFor(status: OrgMembership["status"]): { label: string; color: StatusDotColor } {
  if (status === "active") return { label: "Active", color: "green" };
  if (status === "invited") return { label: "Invited", color: "blue" };
  return { label: "Deactivated", color: "gray" };
}

function verificationFor(status: OrgMembership["status"]): VerificationState {
  if (status === "active") return "verified";
  if (status === "invited") return "variance";
  return "unchecked";
}

function titleCaseRole(role: Role): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function shortDate(iso: string): string {
  return iso.slice(0, 10);
}

export function TeamView({ chrome }: { chrome: ViewChrome }) {
  const domain = useDomain();
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL");
  const [designation, setDesignation] = useState<Designation>("ALL");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"member" | "invite">("member");
  const [memberTab, setMemberTab] = useState<"role" | "activity">("role");
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  const [draftRole, setDraftRole] = useState<Role>("mechanic");
  const [draftCal, setDraftCal] = useState(false);
  const [draftAuditor, setDraftAuditor] = useState(false);
  const [reason, setReason] = useState("");
  const [deactivateReason, setDeactivateReason] = useState("");

  const [inviteForm, setInviteForm] = useState({
    email: "",
    fullName: "",
    role: "mechanic" as Role,
    isCalDesignee: false,
    isDesignatedAuditor: false,
    certificateType: "N/A",
    certificateNumber: "N/A",
  });

  let members: OrgMembership[] = [];
  let accessDenied = false;
  let shopName = "This Shop";
  let shopShort = "This Shop";
  let idleMinutes = 30;
  try {
    const org = domain.store.getOrganization(domain.principal, domain.activeOrgId);
    shopName = org.name;
    shopShort = shortShopName(org.name);
    idleMinutes = org.idle_timeout_minutes;
    members = domain.store.listMembers(domain.principal, domain.activeOrgId);
  } catch (err) {
    if (err instanceof CrossTenantNotFoundError) accessDenied = true;
    else throw err;
  }

  const counts = {
    all: members.length,
    active: members.filter((m) => m.status === "active").length,
    invited: members.filter((m) => m.status === "invited").length,
  };
  const activePct = members.length ? Math.round((counts.active / members.length) * 100) : 0;

  const filtered = useMemo(() => {
    let result = members;
    if (statusTab === "active") result = result.filter((m) => m.status === "active");
    else if (statusTab === "invited") result = result.filter((m) => m.status === "invited");
    if (roleFilter !== "ALL") result = result.filter((m) => m.role === roleFilter);
    if (designation === "cal") result = result.filter((m) => m.is_cal_designee);
    else if (designation === "auditor") result = result.filter((m) => m.is_designated_auditor);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((m) => m.full_name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
    }
    return result;
  }, [members, statusTab, roleFilter, designation, search]);

  const selected = members.find((m) => m.id === selectedId) ?? filtered[0] ?? null;

  useListNav(
    filtered.map((m) => m.id),
    selected?.id ?? null,
    (id) => {
      setSelectedId(id);
      setMode("member");
    },
  );

  useEffect(() => {
    if (!selected) return;
    setDraftRole(selected.role);
    setDraftCal(selected.is_cal_designee);
    setDraftAuditor(selected.is_designated_auditor);
    setReason("");
    setDeactivateReason("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, domain.version]);

  const activeAdminCount = members.filter((m) => m.status === "active" && m.role === "admin").length;
  const canManage = !accessDenied && domain.store.canManageTeam(domain.principal, domain.activeOrgId);
  const isSelectedLastActiveAdmin =
    !!selected && selected.status === "active" && selected.role === "admin" && activeAdminCount === 1;

  const runAction = (fn: () => void, successText?: string) => {
    try {
      fn();
      setMessage(successText ? { kind: "success", text: successText } : null);
    } catch (err) {
      if (err instanceof LastAdminGuardError || err instanceof NotAuthorizedError || err instanceof Error) {
        setMessage({ kind: "error", text: err.message });
      }
    }
  };

  const hasDraftChanges =
    !!selected &&
    (draftRole !== selected.role || draftCal !== selected.is_cal_designee || draftAuditor !== selected.is_designated_auditor);

  const handleSaveMember = () => {
    if (!selected || !hasDraftChanges) return;
    runAction(
      () =>
        domain.mutate((s) =>
          s.updateMember(
            domain.principal,
            domain.activeOrgId,
            selected.id,
            { role: draftRole, isCalDesignee: draftCal, isDesignatedAuditor: draftAuditor },
            reason || null,
          ),
        ),
      `Saved changes for ${selected.full_name}. Recorded to the compliance audit log.`,
    );
  };

  const header = (
    <ContextHeaderBar
      title="Team & Roles"
      subtitle={shopLocationSuffix(shopName) ? `${shopShort} · ${shopLocationSuffix(shopName)}` : shopShort}
      activeView={chrome.activeView}
      onSelectView={chrome.onSelectView}
      search={search}
      onSearch={setSearch}
      searchPlaceholder="Search members by name or email…"
      idleLabel={`Idle Timeout (${idleMinutes}m)`}
      onPreviewIdle={chrome.onPreviewIdle}
      primary={{
        label: "+ Invite Member",
        onClick: () => {
          setMode("invite");
          setMessage(null);
        },
        disabled: !canManage,
      }}
    />
  );

  if (accessDenied) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {header}
        <AccessDeniedPanel message="This persona is not an active Member of the selected Shop, so Team & Roles data is not visible. Each Shop's roster stays fully isolated from every other Shop." />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {header}
      <WorkspaceFilterBar
        scopeLabel={shopShort}
        scopeCount={`${members.length}`}
        pills={[
          {
            label: "Role",
            value: roleFilter === "ALL" ? "All" : titleCaseRole(roleFilter),
            active: roleFilter !== "ALL",
            onClick: () => setRoleFilter(cycleNext(ROLE_CYCLE, roleFilter)),
          },
          {
            label: "Designation",
            value: designation === "ALL" ? "All" : designation === "cal" ? "Cal Designees" : "Auditors",
            active: designation !== "ALL",
            onClick: () => setDesignation(cycleNext(DESIGNATION_CYCLE, designation)),
          },
        ]}
        rightCount={`${filtered.length} ${filtered.length === 1 ? "member" : "members"}`}
      />

      <SplitBody
        list={
          <>
          <ListColumnHeader
            title={`${shopShort} Roster`}
            metric={`${counts.active} of ${members.length} active (${activePct}%)`}
            progressPct={activePct}
            tabs={[
              { key: "all", label: `All (${counts.all})` },
              { key: "active", label: `Active (${counts.active})` },
              { key: "invited", label: `Invited (${counts.invited})` },
            ]}
            activeTab={statusTab}
            onSelectTab={(key) => setStatusTab(key as StatusTab)}
          />
          <ListScroll>
            {filtered.map((member) => {
              const pill = statusPillFor(member.status);
              return (
                <ListRow
                  key={member.id}
                  selected={selected?.id === member.id && mode === "member"}
                  onClick={() => {
                    setSelectedId(member.id);
                    setMode("member");
                    setMemberTab("role");
                    setMessage(null);
                  }}
                  state={verificationFor(member.status)}
                  line1={member.full_name}
                  line2={
                    <>
                      <span className="font-mono">#{member.certificate_number}</span> · {member.email}
                    </>
                  }
                  pill={<StatusPill label={pill.label} color={pill.color} />}
                  subLabel={titleCaseRole(member.role)}
                />
              );
            })}
            {filtered.length === 0 && <p className="px-4 py-6 text-sm text-[#667085]">No members match this filter.</p>}
          </ListScroll>
          </>
        }
        detail={
          <>
          {mode === "invite" ? (
            <InviteMemberForm
              form={inviteForm}
              setForm={setInviteForm}
              canManage={canManage}
              onCancel={() => setMode("member")}
              onSubmit={() =>
                runAction(() => {
                  domain.mutate((s) =>
                    s.inviteMember(
                      domain.principal,
                      domain.activeOrgId,
                      {
                        email: inviteForm.email,
                        fullName: inviteForm.fullName,
                        role: inviteForm.role,
                        isCalDesignee: inviteForm.isCalDesignee,
                        isDesignatedAuditor: inviteForm.isDesignatedAuditor,
                        certificateType: inviteForm.certificateType,
                        certificateNumber: inviteForm.certificateNumber,
                      },
                      null,
                    ),
                  );
                  setMessage({ kind: "success", text: `Invited ${inviteForm.fullName} (${inviteForm.email}).` });
                  setInviteForm({
                    email: "",
                    fullName: "",
                    role: "mechanic",
                    isCalDesignee: false,
                    isDesignatedAuditor: false,
                    certificateType: "N/A",
                    certificateNumber: "N/A",
                  });
                  setMode("member");
                })
              }
              message={message}
            />
          ) : !selected ? (
            <div className="flex h-full items-center justify-center p-10 text-sm text-[#667085]">
              Select a member to view their role, designations, and activity.
            </div>
          ) : (
            <>
              <DetailScroll>
              <DetailTopBar
                breadcrumb={
                  <>
                    {shopShort} Roster › <span className="font-medium text-[#101828]">{selected.full_name}</span>
                  </>
                }
                actions={
                  <div className="flex items-center gap-1 rounded-lg bg-[#f2f4f7] p-0.5">
                    {([
                      ["role", "Role & Designations"],
                      ["activity", "Activity"],
                    ] as Array<[typeof memberTab, string]>).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setMemberTab(key)}
                        className={clsx(
                          "rounded-md px-2.5 py-1 text-xs font-medium transition",
                          memberTab === key ? "bg-white text-[#101828] shadow-2xs" : "text-[#64748b] hover:text-[#101828]",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                }
              />

              <DetailHeaderBlock
                icon={initials(selected.full_name)}
                title={selected.full_name}
                meta={
                  <>
                    <span className="font-medium text-[#344054]">{titleCaseRole(selected.role)}</span>
                    <span>·</span>
                    <span>{selected.email}</span>
                    <span>·</span>
                    <span>Member since {shortDate(selected.created_at)}</span>
                  </>
                }
                pill={<StatusPill label={statusPillFor(selected.status).label} color={statusPillFor(selected.status).color} />}
              />

              <div className="px-7 pt-4">
                <MetadataGrid
                  items={[
                    { label: "Role", value: titleCaseRole(selected.role) },
                    {
                      label: "Certificate",
                      value: <span className="font-mono tabular-nums">{selected.certificate_type} #{selected.certificate_number}</span>,
                    },
                    { label: "Cal Designee", value: selected.is_cal_designee ? "Yes" : "No" },
                    { label: "Designated Auditor", value: selected.is_designated_auditor ? "Yes" : "No" },
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

                {memberTab === "activity" ? (
                  <MemberActivityPanel memberId={selected.id} />
                ) : (
                  <>
                    {isSelectedLastActiveAdmin && (
                      <div className="rounded-lg bg-[#fffaeb] px-3.5 py-2.5 text-sm text-[#93370d] ring-1 ring-inset ring-[#fedf89]">
                        {selected.full_name} is the only active Admin in this Shop. Demoting or deactivating them is blocked until a
                        second active Admin exists.
                      </div>
                    )}

                    <div>
                      <p className="mb-2 text-sm font-medium text-[#344054]">Role</p>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {ROLE_OPTIONS.map((opt) => {
                          const chosen = draftRole === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              disabled={!canManage}
                              onClick={() => setDraftRole(opt.value)}
                              className={clsx(
                                "rounded-lg px-3 py-2.5 text-left text-sm shadow-xs ring-1 ring-inset transition disabled:cursor-not-allowed disabled:opacity-60",
                                chosen
                                  ? "bg-blue-50/30 text-gray-900 ring-2 ring-inset ring-blue-600"
                                  : "bg-white text-[#344054] ring-[#d0d5dd] hover:bg-[#f9fafb]",
                              )}
                            >
                              <span className="flex items-center gap-1.5 font-medium">
                                {chosen && <span className="h-1.5 w-1.5 rounded-full bg-[#155eef]" aria-hidden />}
                                {opt.label}
                              </span>
                              <span className="mt-0.5 block text-xs text-[#667085]">{opt.description}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-medium text-[#344054]">Compliance designations</p>
                      <div className="space-y-2">
                        <DesignationToggle
                          checked={draftCal}
                          disabled={!canManage}
                          onChange={setDraftCal}
                          title="Cal Designee"
                          description="Authorized to verify calibration certificates, correct calibration entry errors, and sign the Monthly Calibration-Record Audit."
                        />
                        <DesignationToggle
                          checked={draftAuditor}
                          disabled={!canManage}
                          onChange={setDraftAuditor}
                          title="Designated Auditor"
                          description="Authorized to conduct and sign independent Facility Audits for areas they did not perform or supervise."
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-[#344054]">Reason (recorded to audit log)</label>
                      <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g. Promoted after completing cal-designee training"
                        disabled={!canManage}
                        className="w-full rounded-lg border border-[#d0d5dd] px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155eef] disabled:bg-[#f9fafb]"
                      />
                    </div>

                    {selected.status !== "deactivated" && (
                      <div className="rounded-lg bg-white p-4 shadow-xs ring-1 ring-inset ring-[#fecdca]">
                        <p className="text-sm font-medium text-[#101828]">Deactivate member</p>
                        <p className="mt-1 text-xs text-[#667085]">
                          Deactivating a team member revokes access immediately while preserving their historical compliance and
                          sign-off records.
                        </p>
                        <input
                          type="text"
                          value={deactivateReason}
                          onChange={(e) => setDeactivateReason(e.target.value)}
                          placeholder="Reason for deactivation (required)"
                          disabled={!canManage}
                          className="mt-2 w-full rounded-lg border border-[#d0d5dd] px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155eef] disabled:bg-[#f9fafb]"
                        />
                        <button
                          type="button"
                          disabled={!canManage || !deactivateReason.trim()}
                          onClick={() =>
                            runAction(() => {
                              domain.mutate((s) => s.deactivateMember(domain.principal, domain.activeOrgId, selected.id, deactivateReason));
                              setDeactivateReason("");
                            }, `${selected.full_name} deactivated. Historical records preserved.`)
                          }
                          className="mt-3 rounded-lg bg-[#d92d20] px-3.5 py-2 text-sm font-medium text-white shadow-xs-skeuomorphic disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Deactivate {selected.full_name}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
              </DetailScroll>

              <DetailFooter
                left={
                  <>
                    <div className="text-xs tabular-nums text-gray-500">Last updated {shortDate(selected.updated_at)} · changes recorded to the audit log</div>
                    <div className="text-[11px] text-gray-400">J / K to navigate · ↵ save</div>
                  </>
                }
              >
                <button
                  type="button"
                  onClick={() => setMemberTab(memberTab === "role" ? "activity" : "role")}
                  className="uui-btn-secondary h-9 rounded-md px-3 text-xs font-medium"
                >
                  {memberTab === "role" ? "View activity" : "Back to role"}
                </button>
                <button
                  type="button"
                  disabled={!canManage || !hasDraftChanges}
                  onClick={handleSaveMember}
                  className="uui-btn-primary h-9 rounded-md px-3.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save changes
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

function DesignationToggle({
  checked,
  disabled,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <label
      className={clsx(
        "flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-sm shadow-xs ring-1 ring-inset transition",
        checked ? "bg-blue-50/30 ring-2 ring-inset ring-blue-600" : "bg-white ring-[#d0d5dd]",
      )}
    >
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="mt-0.5" />
      <span>
        <span className="block font-medium text-[#101828]">{title}</span>
        <span className="block text-xs text-[#667085]">{description}</span>
      </span>
    </label>
  );
}

function MemberActivityPanel({ memberId }: { memberId: string }) {
  const domain = useDomain();
  let entries: ReturnType<typeof domain.store.getAuditLog> = [];
  try {
    entries = domain.store.getAuditLog(domain.principal, domain.activeOrgId).filter((e) => e.record_id === memberId);
  } catch {
    entries = [];
  }
  if (entries.length === 0) {
    return <p className="text-sm text-[#667085]">No recorded activity for this team member yet.</p>;
  }
  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <li key={entry.id} className="rounded-lg bg-white p-3 shadow-xs ring-1 ring-inset ring-[#e4e7ec]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs tabular-nums text-[#667085]">{entry.created_at}</span>
            <StatusPill
              label={entry.action === "INSERT" ? "Added to roster" : "Role updated"}
              color={entry.action === "INSERT" ? "blue" : "purple"}
            />
          </div>
          <p className="mt-1 text-sm text-[#344054]">{entry.reason ?? "No reason recorded"}</p>
          <p className="text-xs text-[#667085]">
            by {entry.actor_name} ({entry.actor_email})
          </p>
        </li>
      ))}
    </ul>
  );
}

function InviteMemberForm({
  form,
  setForm,
  canManage,
  onSubmit,
  onCancel,
  message,
}: {
  form: {
    email: string;
    fullName: string;
    role: Role;
    isCalDesignee: boolean;
    isDesignatedAuditor: boolean;
    certificateType: string;
    certificateNumber: string;
  };
  setForm: (updater: (prev: typeof form) => typeof form) => void;
  canManage: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  message: { kind: "error" | "success"; text: string } | null;
}) {
  return (
    <>
      <DetailScroll>
      <DetailTopBar breadcrumb={<span className="font-medium text-[#101828]">Invite new member</span>} />
      <div className="max-w-3xl flex-1 space-y-4 px-7 py-5">
        {message && message.kind === "error" && (
          <div className="rounded-lg bg-[#fef3f2] px-3.5 py-2.5 text-sm text-[#b42318] ring-1 ring-inset ring-[#fecdca]">{message.text}</div>
        )}
        {!canManage && (
          <div className="rounded-lg bg-[#fffaeb] px-3.5 py-2.5 text-sm text-[#93370d] ring-1 ring-inset ring-[#fedf89]">
            Only an active Admin can invite members. Switch to the Admin persona in the Tweaks pill to send invitations.
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <LabeledInput label="Full name" value={form.fullName} onChange={(v) => setForm((p) => ({ ...p, fullName: v }))} />
          <LabeledInput label="Email" type="email" value={form.email} onChange={(v) => setForm((p) => ({ ...p, email: v }))} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[#344054]">Role</label>
          <select
            value={form.role}
            onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as Role }))}
            className="w-full rounded-lg border border-[#d0d5dd] bg-white px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155eef]"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <LabeledInput
            label="Certificate type"
            value={form.certificateType}
            onChange={(v) => setForm((p) => ({ ...p, certificateType: v }))}
          />
          <LabeledInput
            label="Certificate number"
            value={form.certificateNumber}
            onChange={(v) => setForm((p) => ({ ...p, certificateNumber: v }))}
            mono
          />
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-[#344054]">
            <input type="checkbox" checked={form.isCalDesignee} onChange={(e) => setForm((p) => ({ ...p, isCalDesignee: e.target.checked }))} />
            Cal Designee
          </label>
          <label className="flex items-center gap-2 text-sm text-[#344054]">
            <input
              type="checkbox"
              checked={form.isDesignatedAuditor}
              onChange={(e) => setForm((p) => ({ ...p, isDesignatedAuditor: e.target.checked }))}
            />
            Designated Auditor
          </label>
        </div>
      </div>
      </DetailScroll>
      <DetailFooter left={<div className="text-xs text-gray-500">Invitations are recorded to the compliance audit log.</div>}>
        <button type="button" onClick={onCancel} className="uui-btn-secondary h-9 rounded-md px-3 text-xs font-medium">
          Cancel
        </button>
        <button
          type="button"
          disabled={!canManage || !form.email.trim() || !form.fullName.trim()}
          onClick={onSubmit}
          className="uui-btn-primary h-9 rounded-md px-3.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send invitation
        </button>
      </DetailFooter>
    </>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-[#344054]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(
          "w-full rounded-lg border border-[#d0d5dd] px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155eef]",
          mono && "font-mono tabular-nums",
        )}
      />
    </div>
  );
}
