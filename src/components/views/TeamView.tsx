"use client";

import { useMemo, useState } from "react";
import { UsersPlus } from "@untitledui/icons";
import { clsx } from "clsx";
import { useDomain } from "@/lib/domain/context";
import { CrossTenantNotFoundError, LastAdminGuardError, NotAuthorizedError } from "@/lib/domain/errors";
import type { OrgMembership, Role } from "@/lib/domain/types";
import { StatusPill, type StatusDotColor } from "@/components/primitives/StatusPill";
import { SplitViewWorkspace } from "@/components/primitives/SplitViewWorkspace";
import { initials } from "@/lib/ui-utils";

type MemberFilter = "all" | "active" | "invited" | "deactivated" | "cal" | "auditors";

const ROLE_OPTIONS: Array<{ value: Role; label: string; description: string }> = [
  { value: "admin", label: "Admin", description: "Full Shop management, settings, and team control" },
  { value: "inspector", label: "Inspector", description: "Read audit log, verify compliance work" },
  { value: "mechanic", label: "Mechanic", description: "Day-to-day tool and consumable usage" },
];

function statusPillFor(status: OrgMembership["status"]): { label: string; color: StatusDotColor } {
  if (status === "active") return { label: "Active", color: "green" };
  if (status === "invited") return { label: "Invited", color: "blue" };
  return { label: "Deactivated", color: "gray" };
}

export function TeamView() {
  const domain = useDomain();
  const [filter, setFilter] = useState<MemberFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<"role" | "activity" | "invite">("role");
  const [reason, setReason] = useState("");
  const [deactivateReason, setDeactivateReason] = useState("");
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
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
  try {
    members = domain.store.listMembers(domain.principal, domain.activeOrgId);
  } catch (err) {
    if (err instanceof CrossTenantNotFoundError) {
      accessDenied = true;
    } else {
      throw err;
    }
  }

  const counts = {
    all: members.length,
    active: members.filter((m) => m.status === "active").length,
    invited: members.filter((m) => m.status === "invited").length,
    deactivated: members.filter((m) => m.status === "deactivated").length,
    cal: members.filter((m) => m.is_cal_designee).length,
    auditors: members.filter((m) => m.is_designated_auditor).length,
  };

  const filtered = useMemo(() => {
    let result = members;
    if (filter === "active") result = result.filter((m) => m.status === "active");
    else if (filter === "invited") result = result.filter((m) => m.status === "invited");
    else if (filter === "deactivated") result = result.filter((m) => m.status === "deactivated");
    else if (filter === "cal") result = result.filter((m) => m.is_cal_designee);
    else if (filter === "auditors") result = result.filter((m) => m.is_designated_auditor);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((m) => m.full_name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
    }
    return result;
  }, [members, filter, search]);

  const selected = members.find((m) => m.id === selectedId) ?? filtered[0] ?? null;
  const activeAdminCount = members.filter((m) => m.status === "active" && m.role === "admin").length;
  const canManage = domain.store.canManageTeam(domain.principal, domain.activeOrgId);

  const runAction = (fn: () => void) => {
    try {
      fn();
      setMessage(null);
    } catch (err) {
      if (err instanceof LastAdminGuardError || err instanceof NotAuthorizedError || err instanceof Error) {
        setMessage({ kind: "error", text: err.message });
      }
    }
  };

  if (accessDenied) {
    return (
      <div className="flex h-full items-center justify-center p-10 text-center">
        <div>
          <p className="text-sm font-semibold text-[#101828]">No access to this Shop</p>
          <p className="mt-1 max-w-sm text-sm text-[#667085]">
            This persona is not an active Member of the selected Shop, so Team &amp; Roles data is not visible.
            Each Shop's roster stays fully isolated from every other Shop.
          </p>
        </div>
      </div>
    );
  }

  const isSelectedLastActiveAdmin = !!selected && selected.status === "active" && selected.role === "admin" && activeAdminCount === 1;

  return (
    <SplitViewWorkspace>
      <div className="flex h-full flex-col">
        <div className="border-b border-[#e4e7ec] bg-white px-4 py-3">
          <h2 className="text-sm font-semibold text-[#101828]">Team members</h2>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
            className="mt-2 w-full rounded-lg border border-[#d0d5dd] px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155eef]"
          />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(
              [
                ["all", `All (${counts.all})`],
                ["active", `Active (${counts.active})`],
                ["invited", `Invited (${counts.invited})`],
                ["deactivated", `Deactivated (${counts.deactivated})`],
                ["cal", `Cal Designees (${counts.cal})`],
                ["auditors", `Auditors (${counts.auditors})`],
              ] as Array<[MemberFilter, string]>
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

        <div className="flex-1 overflow-y-auto">
          {filtered.map((member) => {
            const pill = statusPillFor(member.status);
            const isActive = selected?.id === member.id;
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => {
                  setSelectedId(member.id);
                  setTab("role");
                  setMessage(null);
                }}
                className={clsx(
                  "flex w-full items-center gap-3 border-b border-[#e4e7ec] px-4 py-3 text-left last:border-b-0 hover:bg-[#f9fafb]",
                  isActive && "bg-[#f2f4f7]/90",
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f2f4f7] text-xs font-semibold text-[#344054] ring-1 ring-inset ring-[#e4e7ec]">
                  {initials(member.full_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={clsx("truncate text-sm", isActive ? "font-semibold text-[#101828]" : "font-medium text-[#101828]")}>
                    {member.full_name}
                  </p>
                  <p className="truncate text-xs text-[#667085] tabular-nums">
                    {member.email} · {member.certificate_type} #{member.certificate_number}
                  </p>
                </div>
                <StatusPill label={pill.label} color={pill.color} />
              </button>
            );
          })}
          {filtered.length === 0 && <p className="px-4 py-6 text-sm text-[#667085]">No members match this filter.</p>}
        </div>
      </div>

      <div className="h-full">
        {!selected && tab !== "invite" ? (
          <div className="flex h-full items-center justify-center p-10 text-sm text-[#667085]">Select a member to view details.</div>
        ) : (
          <div className="p-6">
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

            <div className="flex items-center justify-between">
              <div>
                {selected && (
                  <>
                    <h1 className="text-lg font-semibold text-[#101828]">{selected.full_name}</h1>
                    <p className="text-sm text-[#667085] tabular-nums">{selected.email}</p>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setTab("invite")}
                disabled={!canManage}
                className="uui-btn-primary inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium disabled:opacity-50"
              >
                <UsersPlus className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                Invite member
              </button>
            </div>

            <div className="mt-4 flex gap-4 border-b border-[#e4e7ec]">
              {(
                [
                  ["role", "Role & Designations"],
                  ["activity", "Member Activity & Audit Trail"],
                  ["invite", "Invite New Member"],
                ] as Array<[typeof tab, string]>
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={clsx(
                    "border-b-2 px-1 py-2 text-sm font-medium",
                    tab === key ? "border-[#155eef] text-[#155eef]" : "border-transparent text-[#667085] hover:text-[#344054]",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "role" && selected && (
              <div className="mt-5 space-y-6">
                {isSelectedLastActiveAdmin && (
                  <div className="rounded-lg bg-[#fffaeb] px-3.5 py-2.5 text-sm text-[#93370d] ring-1 ring-inset ring-[#fedf89]">
                    Last-Admin Guard: {selected.full_name} is the only active Admin in this Shop. Deactivating or
                    demoting them is blocked until a second active Admin exists.
                  </div>
                )}

                <div>
                  <p className="mb-2 text-sm font-medium text-[#344054]">Role</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {ROLE_OPTIONS.map((opt) => {
                      const isChosen = selected.role === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={!canManage}
                          onClick={() =>
                            runAction(() =>
                              domain.mutate((s) => s.updateMember(domain.principal, domain.activeOrgId, selected.id, { role: opt.value }, reason || null)),
                            )
                          }
                          className={clsx(
                            "rounded-lg px-3 py-2.5 text-left text-sm shadow-xs ring-1 ring-inset disabled:cursor-not-allowed disabled:opacity-60",
                            isChosen ? "bg-[#eff4ff]/30 text-[#101828] ring-2 ring-[#155eef]" : "bg-white text-[#344054] ring-1 ring-[#d0d5dd] hover:bg-[#f9fafb]",
                          )}
                        >
                          <span className="flex items-center gap-1.5 font-medium">
                            {isChosen && <span className="h-1.5 w-1.5 rounded-full bg-[#155eef]" aria-hidden />}
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
                    <label className="flex items-start gap-2.5 rounded-lg bg-white px-3 py-2.5 text-sm shadow-xs ring-1 ring-inset ring-[#d0d5dd]">
                      <input
                        type="checkbox"
                        checked={selected.is_cal_designee}
                        disabled={!canManage}
                        onChange={(e) =>
                          runAction(() =>
                            domain.mutate((s) =>
                              s.updateMember(domain.principal, domain.activeOrgId, selected.id, { isCalDesignee: e.target.checked }, reason || null),
                            ),
                          )
                        }
                        className="mt-0.5"
                      />
                      <span>
                        <span className="block font-medium text-[#101828]">Cal Designee</span>
                        <span className="block text-xs text-[#667085]">
                          Authorized to verify calibration certificates, correct calibration entry errors, and sign
                          the Monthly Calibration-Record Audit.
                        </span>
                      </span>
                    </label>
                    <label className="flex items-start gap-2.5 rounded-lg bg-white px-3 py-2.5 text-sm shadow-xs ring-1 ring-inset ring-[#d0d5dd]">
                      <input
                        type="checkbox"
                        checked={selected.is_designated_auditor}
                        disabled={!canManage}
                        onChange={(e) =>
                          runAction(() =>
                            domain.mutate((s) =>
                              s.updateMember(domain.principal, domain.activeOrgId, selected.id, { isDesignatedAuditor: e.target.checked }, reason || null),
                            ),
                          )
                        }
                        className="mt-0.5"
                      />
                      <span>
                        <span className="block font-medium text-[#101828]">Designated Auditor</span>
                        <span className="block text-xs text-[#667085]">
                          Authorized to conduct and sign independent Facility Audits for areas they did not perform
                          or supervise.
                        </span>
                      </span>
                    </label>
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
                      Deactivating a team member revokes access immediately while preserving their historical
                      compliance and sign-off records.
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
                        })
                      }
                      className="mt-3 rounded-lg bg-[#d92d20] px-3.5 py-2 text-sm font-medium text-white shadow-xs-skeuomorphic disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Deactivate {selected.full_name}
                    </button>
                  </div>
                )}
              </div>
            )}

            {tab === "activity" && selected && <MemberActivityTab memberId={selected.id} />}

            {tab === "invite" && (
              <InviteMemberForm
                form={inviteForm}
                setForm={setInviteForm}
                canManage={canManage}
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
                    setTab("role");
                  })
                }
              />
            )}
          </div>
        )}
      </div>
    </SplitViewWorkspace>
  );
}

function MemberActivityTab({ memberId }: { memberId: string }) {
  const domain = useDomain();
  let entries: ReturnType<typeof domain.store.getAuditLog> = [];
  try {
    entries = domain.store.getAuditLog(domain.principal, domain.activeOrgId).filter((e) => e.record_id === memberId);
  } catch {
    entries = [];
  }
  return (
    <div className="mt-5">
      {entries.length === 0 && <p className="text-sm text-[#667085]">No recorded activity for this team member yet.</p>}
      <ul className="space-y-3">
        {entries.map((entry) => (
          <li key={entry.id} className="rounded-lg bg-white p-3 shadow-xs ring-1 ring-inset ring-[#e4e7ec]">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs tabular-nums text-[#667085]">{entry.created_at}</span>
              <StatusPill label={`Recorded · ${entry.action}`} color={entry.action === "INSERT" ? "blue" : "purple"} />
            </div>
            <p className="mt-1 text-sm text-[#344054]">{entry.reason ?? "No reason recorded"}</p>
            <p className="text-xs text-[#667085]">
              by {entry.actor_name} ({entry.actor_email})
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InviteMemberForm({
  form,
  setForm,
  canManage,
  onSubmit,
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
}) {
  return (
    <div className="mt-5 max-w-md space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-[#344054]">Full name</label>
        <input
          type="text"
          value={form.fullName}
          onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
          className="w-full rounded-lg border border-[#d0d5dd] px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155eef]"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-[#344054]">Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          className="w-full rounded-lg border border-[#d0d5dd] px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155eef]"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-[#344054]">Role</label>
        <select
          value={form.role}
          onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as Role }))}
          className="w-full rounded-lg border border-[#d0d5dd] bg-white px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155eef]"
        >
          {ROLE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-[#344054]">Certificate type</label>
          <input
            type="text"
            value={form.certificateType}
            onChange={(e) => setForm((prev) => ({ ...prev, certificateType: e.target.value }))}
            className="w-full rounded-lg border border-[#d0d5dd] px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155eef]"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[#344054]">Certificate number</label>
          <input
            type="text"
            value={form.certificateNumber}
            onChange={(e) => setForm((prev) => ({ ...prev, certificateNumber: e.target.value }))}
            className="w-full rounded-lg border border-[#d0d5dd] px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-[#155eef]"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-[#344054]">
          <input
            type="checkbox"
            checked={form.isCalDesignee}
            onChange={(e) => setForm((prev) => ({ ...prev, isCalDesignee: e.target.checked }))}
          />
          Cal Designee
        </label>
        <label className="flex items-center gap-2 text-sm text-[#344054]">
          <input
            type="checkbox"
            checked={form.isDesignatedAuditor}
            onChange={(e) => setForm((prev) => ({ ...prev, isDesignatedAuditor: e.target.checked }))}
          />
          Designated Auditor
        </label>
      </div>
      <button
        type="button"
        disabled={!canManage || !form.email.trim() || !form.fullName.trim()}
        onClick={onSubmit}
        className="uui-btn-primary rounded-lg px-3.5 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
      >
        Send invitation
      </button>
    </div>
  );
}
