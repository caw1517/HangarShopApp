"use client";

import { useEffect, useId, useMemo, useState } from "react";
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

/** Map domain errors to plain, product-facing copy — never surface raw codes like "LAST_ADMIN_GUARD:". */
function humanError(err: unknown): string {
  if (err instanceof LastAdminGuardError) {
    return "This Shop must always have at least one active Admin. Promote or add another Admin before changing this one.";
  }
  if (err instanceof NotAuthorizedError) {
    return "You don't have permission to do that in this Shop.";
  }
  if (err instanceof Error) return err.message.replace(/^[A-Z_]+:\s*/, "");
  return "Something went wrong.";
}

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
  const reasonId = useId();
  const deactivateReasonId = useId();

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
  try {
    const org = domain.store.getOrganization(domain.principal, domain.activeOrgId);
    shopName = org.name;
    shopShort = shortShopName(org.name);
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
      setMessage({ kind: "error", text: humanError(err) });
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
        <AccessDeniedPanel message="You are not an active Member of the selected Shop, so its team list isn't shown. Ask one of its Admins for an invite." />
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
            {filtered.length === 0 && <p className="px-4 py-6 text-sm text-slate-600">No members match this filter.</p>}
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
              onSubmit={() => {
                // Capture the name/email before the form is reset so the
                // success banner can name the invitee.
                const invitedName = inviteForm.fullName;
                const invitedEmail = inviteForm.email;
                runAction(
                  () => {
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
                  },
                  `Invited ${invitedName} (${invitedEmail}). Recorded to the compliance audit log.`,
                );
              }}
              message={message}
            />
          ) : !selected ? (
            <div className="flex h-full items-center justify-center p-10 text-sm text-slate-600">
              Select a member to view their role, designations, and activity.
            </div>
          ) : (
            <>
              <DetailScroll>
              <DetailTopBar
                breadcrumb={
                  <>
                    {shopShort} Roster › <span className="font-medium text-slate-900">{selected.full_name}</span>
                  </>
                }
                actions={
                  <div className="flex items-center gap-1 rounded-sm bg-white p-0.5 ring-1 ring-inset ring-slate-500">
                    {([
                      ["role", "Role & Designations"],
                      ["activity", "Activity"],
                    ] as Array<[typeof memberTab, string]>).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setMemberTab(key)}
                        className={clsx(
                          "rounded-sm px-2.5 py-1 text-xs font-medium transition",
                          memberTab === key ? "bg-accent-tint text-accent" : "text-slate-600 hover:text-slate-900",
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
                    <span className="font-medium text-slate-700">{titleCaseRole(selected.role)}</span>
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
                      "rounded-sm px-3.5 py-2.5 text-sm ring-1 ring-inset",
                      message.kind === "error" ? "bg-error-tint text-error ring-error/25" : "bg-success-tint text-success ring-success/25",
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
                      <div className="rounded-sm bg-warning-tint px-3.5 py-2.5 text-sm text-warning ring-1 ring-inset ring-warning/25">
                        {selected.full_name} is the only active Admin in this Shop. Demoting or deactivating them is blocked until a
                        second active Admin exists.
                      </div>
                    )}

                    <div>
                      <p className="mb-2 text-sm font-medium text-slate-700">Role</p>
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
                                "rounded-sm px-3 py-2.5 text-left text-sm ring-1 ring-inset transition disabled:cursor-not-allowed disabled:opacity-60",
                                chosen
                                  ? "bg-accent-tint/40 text-slate-900 ring-2 ring-inset ring-accent"
                                  : "bg-white text-slate-700 ring-slate-500 hover:bg-slate-50",
                              )}
                            >
                              <span className="flex items-center gap-1.5 font-medium">
                                {chosen && <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />}
                                {opt.label}
                              </span>
                              <span className="mt-0.5 block text-xs text-slate-600">{opt.description}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-medium text-slate-700">Compliance designations</p>
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
                      <label htmlFor={reasonId} className="mb-1 block text-sm font-medium text-slate-700">Reason (recorded to audit log)</label>
                      <input
                        id={reasonId}
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="e.g. Promoted after completing cal-designee training"
                        disabled={!canManage}
                        className="w-full rounded-sm border border-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-ring disabled:bg-slate-100"
                      />
                    </div>

                    {selected.status !== "deactivated" && (
                      <div className="rounded-sm bg-white p-4 ring-1 ring-inset ring-error/25">
                        <p className="text-sm font-medium text-slate-900">Deactivate member</p>
                        <p className="mt-1 text-xs text-slate-600">
                          Deactivating a team member revokes access immediately while preserving their historical compliance and
                          sign-off records.
                        </p>
                        <label htmlFor={deactivateReasonId} className="sr-only">
                          Reason for deactivation
                        </label>
                        <input
                          id={deactivateReasonId}
                          type="text"
                          value={deactivateReason}
                          onChange={(e) => setDeactivateReason(e.target.value)}
                          placeholder="Reason for deactivation (required)"
                          disabled={!canManage}
                          className="mt-2 w-full rounded-sm border border-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-ring disabled:bg-slate-100"
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
                          className="mt-3 rounded-sm bg-error px-3.5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
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
                    <div className="text-xs tabular-nums text-slate-600">Last updated {shortDate(selected.updated_at)} · changes recorded to the audit log</div>
                  </>
                }
              >
                <button
                  type="button"
                  onClick={() => setMemberTab(memberTab === "role" ? "activity" : "role")}
                  className="uui-btn-secondary h-9 rounded-sm px-3 text-xs font-medium"
                >
                  {memberTab === "role" ? "View activity" : "Back to role"}
                </button>
                <button
                  type="button"
                  disabled={!canManage || !hasDraftChanges}
                  onClick={handleSaveMember}
                  className="uui-btn-primary h-9 rounded-sm px-3.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
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
        "flex items-start gap-2.5 rounded-sm px-3 py-2.5 text-sm ring-1 ring-inset transition",
        checked ? "bg-accent-tint/40 ring-2 ring-inset ring-accent" : "bg-white ring-slate-500",
      )}
    >
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="mt-0.5" />
      <span>
        <span className="block font-medium text-slate-900">{title}</span>
        <span className="block text-xs text-slate-600">{description}</span>
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
    return <p className="text-sm text-slate-600">No recorded activity for this team member yet.</p>;
  }
  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <li key={entry.id} className="rounded-sm bg-white p-3 ring-1 ring-inset ring-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs tabular-nums text-slate-600">{entry.created_at}</span>
            <StatusPill
              label={entry.action === "INSERT" ? "Added to roster" : "Role updated"}
              color={entry.action === "INSERT" ? "blue" : "purple"}
            />
          </div>
          <p className="mt-1 text-sm text-slate-700">{entry.reason ?? "No reason recorded"}</p>
          <p className="text-xs text-slate-600">
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
  const roleId = useId();
  return (
    <>
      <DetailScroll>
      <DetailTopBar breadcrumb={<span className="font-medium text-slate-900">Invite new member</span>} />
      <div className="max-w-3xl flex-1 space-y-4 px-7 py-5">
        {message && message.kind === "error" && (
          <div className="rounded-sm bg-error-tint px-3.5 py-2.5 text-sm text-error ring-1 ring-inset ring-error/25">{message.text}</div>
        )}
        {!canManage && (
          <div className="rounded-sm bg-warning-tint px-3.5 py-2.5 text-sm text-warning ring-1 ring-inset ring-warning/25">
            Only an active Admin can invite members.
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <LabeledInput label="Full name" value={form.fullName} onChange={(v) => setForm((p) => ({ ...p, fullName: v }))} />
          <LabeledInput label="Email" type="email" value={form.email} onChange={(v) => setForm((p) => ({ ...p, email: v }))} />
        </div>
        <div>
          <label htmlFor={roleId} className="mb-1 block text-sm font-medium text-slate-700">Role</label>
          <select
            id={roleId}
            value={form.role}
            onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as Role }))}
            className="w-full rounded-sm border border-slate-500 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-ring"
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
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.isCalDesignee} onChange={(e) => setForm((p) => ({ ...p, isCalDesignee: e.target.checked }))} />
            Cal Designee
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
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
      <DetailFooter left={<div className="text-xs text-slate-600">Invitations are recorded to the compliance audit log.</div>}>
        <button type="button" onClick={onCancel} className="uui-btn-secondary h-9 rounded-sm px-3 text-xs font-medium">
          Cancel
        </button>
        <button
          type="button"
          disabled={!canManage || !form.email.trim() || !form.fullName.trim()}
          onClick={onSubmit}
          className="uui-btn-primary h-9 rounded-sm px-3.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
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
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(
          "w-full rounded-sm border border-slate-500 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-ring",
          mono && "font-mono tabular-nums",
        )}
      />
    </div>
  );
}
