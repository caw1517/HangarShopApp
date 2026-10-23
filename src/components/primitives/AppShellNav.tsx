"use client";

import {
  Beaker01,
  ClipboardCheck,
  FileCheck02,
  Home02,
  MarkerPin01,
  Plane,
  Settings01,
  Tool02,
  Users01,
} from "@untitledui/icons";
import { clsx } from "clsx";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDomain } from "@/lib/domain/context";
import { ORG_APEX_ID, ORG_CASCADE_ID, ORG_SLUG_BY_ID } from "@/lib/domain/seed";
import { CrossTenantNotFoundError } from "@/lib/domain/errors";
import { initials, titleCase } from "@/lib/ui-utils";

export type WorkspaceView = "team" | "audit-log" | "settings";

const PRIMARY_NAV: Array<{ key: string; label: string; icon: typeof Home02; planned: boolean; badge?: string; view?: WorkspaceView }> = [
  { key: "dashboard", label: "Dashboard", icon: Home02, planned: true },
  { key: "tools", label: "Tools & Calibration", icon: Tool02, planned: true },
  { key: "consumables", label: "Consumables & Lots", icon: Beaker01, planned: true },
  { key: "locations", label: "Locations", icon: MarkerPin01, planned: true },
  { key: "audits", label: "Audits & Cycle Counts", icon: ClipboardCheck, planned: true },
  { key: "fleet", label: "Fleet & Programs", icon: Plane, planned: true },
  { key: "workorders", label: "Work Orders", icon: FileCheck02, planned: true },
  { key: "import-settings", label: "Import & Settings", icon: Settings01, planned: false, view: "settings" },
];

export const FOUNDATION_TABS: Array<{ key: WorkspaceView; label: string }> = [
  { key: "team", label: "Team & Roles" },
  { key: "audit-log", label: "Audit Log" },
  { key: "settings", label: "Shop Settings" },
];

const SHOPS = [
  { id: ORG_APEX_ID, shortLabel: "Apex Charter MX — Hangar 1" },
  { id: ORG_CASCADE_ID, shortLabel: "Cascade Flight Services" },
];

export function AppShellNav({ activeView }: { activeView: WorkspaceView }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const domain = useDomain();

  const pushParams = (next: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([k, v]) => params.set(k, v));
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleShopChange = (orgId: string) => {
    domain.setActiveOrgId(orgId);
    pushParams({ shop: ORG_SLUG_BY_ID[orgId] ?? orgId });
  };

  const handleTabClick = (view: WorkspaceView) => {
    pushParams({ view });
  };

  let activeOrgName = "Unknown Shop";
  let activeOrgPrefix = "";
  let activeOrgTimezone = "";
  let callerRoleLabel = "No access";
  let hasAccess = false;
  let footerSubtitle = domain.principal.isPlatformOwner ? "Platform Owner" : "No access";
  try {
    const org = domain.store.getOrganization(domain.principal, domain.activeOrgId);
    activeOrgName = org.name;
    activeOrgPrefix = org.tool_id_prefix;
    activeOrgTimezone = org.timezone;
    const members = domain.store.listMembers(domain.principal, domain.activeOrgId);
    const me = members.find((m) => m.user_id === domain.principal.userId);
    callerRoleLabel = me ? titleCase(me.role) : "No access";
    hasAccess = true;
    if (me) {
      const designations: string[] = [];
      if (me.is_cal_designee) designations.push("Cal Designee");
      if (me.is_designated_auditor) designations.push("Designated Auditor");
      footerSubtitle = designations.length > 0 ? `${titleCase(me.role)} · ${designations.join(" · ")}` : titleCase(me.role);
    }
  } catch (err) {
    if (!(err instanceof CrossTenantNotFoundError)) throw err;
    activeOrgName = SHOPS.find((s) => s.id === domain.activeOrgId)?.shortLabel ?? "Unknown Shop";
  }

  return (
    <nav className="flex h-full w-60 shrink-0 flex-col bg-[#0c111d] text-[#cecfd2]">
      <div className="border-b border-white/10 px-4 py-4">
        <label className="mb-1.5 block text-[11px] font-medium text-[#94969c]">Shop</label>
        <div className="relative">
          <select
            value={domain.activeOrgId}
            onChange={(e) => handleShopChange(e.target.value)}
            className="w-full appearance-none rounded-md border border-white/10 bg-[#161b26] px-2.5 py-2 pr-7 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-[#155eef]"
          >
            {SHOPS.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.shortLabel}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-2 truncate text-sm font-semibold text-white">{activeOrgName}</p>
        {hasAccess && (
          <div className="mt-1 flex items-center gap-2 text-xs text-[#94969c]">
            <span className="font-mono tabular-nums">{activeOrgPrefix}</span>
            <span aria-hidden>·</span>
            <span>{activeOrgTimezone}</span>
          </div>
        )}
        <span className="mt-2 inline-flex items-center rounded-md bg-white/10 px-2 py-0.5 text-xs font-medium text-white">
          {callerRoleLabel}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-0.5">
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = item.view === activeView;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  disabled={item.planned}
                  onClick={() => item.view && handleTabClick(item.view)}
                  className={clsx(
                    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                    isActive ? "bg-[#1f242f] text-white" : "text-[#cecfd2] hover:bg-[#1f242f]/60 hover:text-white",
                    item.planned && "cursor-default opacity-60 hover:bg-transparent hover:text-[#cecfd2]",
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} aria-hidden />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-[#94969c]">
                      {item.badge}
                    </span>
                  )}
                  {item.planned && !item.badge && (
                    <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-[#94969c]">
                      Planned
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-6">
          <p className="px-2.5 text-[11px] font-medium text-[#61656c]">Administration</p>
          <ul className="mt-1.5 space-y-0.5">
            {FOUNDATION_TABS.map((tab) => (
              <li key={tab.key}>
                <button
                  type="button"
                  onClick={() => handleTabClick(tab.key)}
                  className={clsx(
                    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                    activeView === tab.key
                      ? "bg-[#1f242f] text-white"
                      : "text-[#cecfd2] hover:bg-[#1f242f]/60 hover:text-white",
                  )}
                >
                  <Users01 className="h-[18px] w-[18px] shrink-0 opacity-0" aria-hidden />
                  <span className="flex-1 text-left">{tab.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
            {initials(domain.principal.fullName)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{domain.principal.fullName}</p>
            <p className="truncate text-xs text-[#94969c]">{footerSubtitle}</p>
          </div>
        </div>
      </div>
    </nav>
  );
}
