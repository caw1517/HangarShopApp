"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Boxes,
  Check,
  ChevronDown,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  MapPin,
  Plane,
  Settings,
  ShieldCheck,
  Upload,
  Users,
  Wrench,
} from "@/components/primitives/icons";
import { useDomain } from "@/lib/domain/context";
import { ORG_APEX_ID, ORG_CASCADE_ID, ORG_SLUG_BY_ID } from "@/lib/domain/seed";
import { CrossTenantNotFoundError } from "@/lib/domain/errors";
import { initials, shopLocationSuffix, shortShopName, titleCase } from "@/lib/ui-utils";
import { FOUNDATION_TABS, type PreviewSection, type WorkspaceView } from "@/components/primitives/workspace";

// These sections are not yet backed by per-Shop data, so they carry no count
// badge (a hard-coded count would read as real inventory and be identical in
// every Shop). Counts return once each module ships its own data.
const PRIMARY_NAV: Array<{ key: PreviewSection; label: string; icon: typeof LayoutDashboard }> = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "tools", label: "Tools & Calibration", icon: Wrench },
  { key: "consumables", label: "Consumables & Lots", icon: Boxes },
  { key: "locations", label: "Locations", icon: MapPin },
  { key: "audits", label: "Audits & Cycle Counts", icon: ClipboardCheck },
  { key: "imports", label: "Imports", icon: Upload },
  { key: "fleet", label: "Fleet & Programs", icon: Plane },
  { key: "workorders", label: "Work Orders", icon: FileText },
];

const ADMIN_ICON: Record<WorkspaceView, typeof Users> = {
  team: Users,
  "audit-log": ShieldCheck,
  settings: Settings,
};

const SHOPS = [
  { id: ORG_APEX_ID, fallback: "Apex Charter MX — Hangar 1" },
  { id: ORG_CASCADE_ID, fallback: "Cascade Flight Services" },
];

interface AppShellNavProps {
  activeView: WorkspaceView;
  activeSection: PreviewSection | null;
  onSelectView: (view: WorkspaceView) => void;
  onSelectSection: (section: PreviewSection) => void;
}

export function AppShellNav({ activeView, activeSection, onSelectView, onSelectSection }: AppShellNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const domain = useDomain();
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const handleShopChange = (orgId: string) => {
    domain.setActiveOrgId(orgId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("shop", ORG_SLUG_BY_ID[orgId] ?? orgId);
    router.push(`${pathname}?${params.toString()}`);
    setSwitcherOpen(false);
  };

  // Shop header derivation (two-line title + brand mark), with a graceful
  // fallback for a signed-in user with no read access to the active Shop (e.g.
  // the Platform Owner). The fallback is split the same way as a readable Shop
  // so the brand line stays short ("Apex Charter MX") instead of showing the
  // full "— Hangar 1" suffix and truncating.
  const fallbackName = SHOPS.find((s) => s.id === domain.activeOrgId)?.fallback ?? "Unknown Shop";
  let shopTitle = shortShopName(fallbackName);
  let shopLocation: string | null = shopLocationSuffix(fallbackName);
  let hasAccess = false;
  let footerSubtitle = domain.principal.isPlatformOwner ? "Platform Owner" : "No Shop access";
  let memberCount: number | null = null;
  let auditCount: number | null = null;

  try {
    const org = domain.store.getOrganization(domain.principal, domain.activeOrgId);
    shopTitle = shortShopName(org.name);
    shopLocation = shopLocationSuffix(org.name);
    hasAccess = true;

    const members = domain.store.listMembers(domain.principal, domain.activeOrgId);
    memberCount = members.length;
    const me = members.find((m) => m.user_id === domain.principal.userId);
    if (me) {
      const designations: string[] = [];
      if (me.is_cal_designee) designations.push("Cal Designee");
      if (me.is_designated_auditor) designations.push("Designated Auditor");
      footerSubtitle = designations.length > 0 ? `${titleCase(me.role)} · ${designations.join(" · ")}` : titleCase(me.role);
    }
  } catch (err) {
    if (!(err instanceof CrossTenantNotFoundError)) throw err;
  }

  try {
    auditCount = domain.store.getAuditLog(domain.principal, domain.activeOrgId).length;
  } catch {
    auditCount = null;
  }

  const brandInitials = initials(shopTitle);
  // Rail subtitle is the location only (e.g. "Hangar 1"); the tool-ID prefix and
  // timezone live in the Settings detail header, not the rail, so the line stays
  // short and never truncates at narrow widths.
  const subtitleParts = [shopLocation].filter(Boolean);

  const ADMIN_COUNT: Record<WorkspaceView, number | null> = {
    team: memberCount,
    "audit-log": auditCount,
    settings: 4,
  };

  return (
    <nav className="flex h-full w-[232px] shrink-0 select-none flex-col border-r border-[#1f242f] bg-[#0c111d] text-white">
      {/* Shop switcher header block */}
      <div className="relative p-3.5">
        <button
          type="button"
          onClick={() => setSwitcherOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-2.5 rounded-md px-2 py-1.5 transition hover:bg-[#1f242f]/60"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#155eef] text-xs font-semibold text-white">
              {brandInitials}
            </span>
            <span className="min-w-0 text-left">
              <span className="line-clamp-2 text-sm font-semibold leading-tight tracking-tight text-white">{shopTitle}</span>
              {subtitleParts.length > 0 && (
                <span className="block truncate text-[11px] text-white/65">{subtitleParts.join(" · ")}</span>
              )}
            </span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/60" />
        </button>

        {switcherOpen && (
          <>
            <button
              type="button"
              aria-label="Close shop switcher"
              onClick={() => setSwitcherOpen(false)}
              className="fixed inset-0 z-10 cursor-default"
            />
            <div className="absolute left-3.5 right-3.5 top-[3.75rem] z-20 overflow-hidden rounded-lg border border-[#1f242f] bg-[#161b26] p-1 shadow-xl">
              <p className="px-2 py-1.5 text-[11px] font-medium text-white/45">Switch Shop</p>
              {SHOPS.map((shop) => {
                const active = shop.id === domain.activeOrgId;
                const shortTitle = shortShopName(shop.fallback);
                return (
                  <button
                    key={shop.id}
                    type="button"
                    onClick={() => handleShopChange(shop.id)}
                    className={clsx(
                      "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition",
                      active ? "bg-[#1f242f] text-white" : "text-white/80 hover:bg-[#1f242f]/60 hover:text-white",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#155eef] text-[10px] font-semibold text-white">
                        {initials(shortTitle)}
                      </span>
                      <span className="truncate text-xs font-medium">{shop.fallback}</span>
                    </span>
                    {active && <Check className="h-3.5 w-3.5 shrink-0 text-[#155eef]" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Primary navigation + Administration */}
      <div className="flex-1 overflow-y-auto px-2.5 pb-3">
        <div className="space-y-0.5">
          {PRIMARY_NAV.map((item) => (
            <NavItem
              key={item.key}
              icon={item.icon}
              label={item.label}
              active={activeSection === item.key}
              onClick={() => onSelectSection(item.key)}
            />
          ))}
        </div>

        <div className="my-3 border-t border-[#1f242f] pt-3">
          <p className="px-3 pb-1 text-[11px] font-medium text-white/45">Administration</p>
          <div className="space-y-0.5">
            {FOUNDATION_TABS.map((tab) => (
              <NavItem
                key={tab.key}
                icon={ADMIN_ICON[tab.key]}
                label={tab.key === "audit-log" ? "Audit Log" : tab.label}
                count={ADMIN_COUNT[tab.key] ?? undefined}
                active={activeSection === null && activeView === tab.key}
                onClick={() => onSelectView(tab.key)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Signed-in user footer */}
      <div className="border-t border-[#1f242f] bg-[#0c111d] p-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#155eef] text-[11px] font-medium text-white">
            {initials(domain.principal.fullName)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-white">{domain.principal.fullName}</p>
            <p className="line-clamp-2 text-[11px] leading-tight text-white/65">{hasAccess || domain.principal.isPlatformOwner ? footerSubtitle : "No Shop access"}</p>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavItem({
  icon: Icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex w-full items-center justify-between gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition",
        active ? "bg-[#1f242f] text-white" : "text-white/75 hover:bg-[#1f242f]/60 hover:text-white",
      )}
    >
      <span className="flex items-center gap-2.5">
        <Icon className={clsx("h-4 w-4 shrink-0", active ? "text-[#155eef]" : "text-white/65")} />
        <span>{label}</span>
      </span>
      {count != null && (
        <span className={clsx("text-[11px] tabular-nums", active ? "text-white/80" : "text-white/60")}>{count}</span>
      )}
    </button>
  );
}
