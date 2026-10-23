"use client";

import { useEffect } from "react";
import { clsx } from "clsx";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AppShellNav, FOUNDATION_TABS, type WorkspaceView } from "@/components/primitives/AppShellNav";
import { IdleTimeoutModal } from "@/components/primitives/IdleTimeoutModal";
import { StatusPill } from "@/components/primitives/StatusPill";
import { TweaksPill } from "@/components/primitives/TweaksPill";
import { AuditLogView } from "@/components/views/AuditLogView";
import { SettingsView } from "@/components/views/SettingsView";
import { TeamView } from "@/components/views/TeamView";
import { CrossTenantNotFoundError } from "@/lib/domain/errors";
import { DomainProvider, useDomain } from "@/lib/domain/context";
import { PERSONAS, type PersonaKey } from "@/lib/domain/personas";
import { ORG_ID_BY_SLUG } from "@/lib/domain/seed";

export function AppRoot() {
  return (
    <DomainProvider>
      <AppRootInner />
    </DomainProvider>
  );
}

function AppRootInner() {
  const domain = useDomain();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const viewParam = searchParams.get("view");
  const view: WorkspaceView = viewParam === "audit-log" || viewParam === "settings" ? viewParam : "team";
  const shopParam = searchParams.get("shop");
  const personaParam = searchParams.get("persona") as PersonaKey | null;

  useEffect(() => {
    // Accepts the human-readable Shop slug (?shop=org-apex-h1) per issue #28's deep-link contract.
    const resolvedOrgId = shopParam ? ORG_ID_BY_SLUG[shopParam] : undefined;
    if (resolvedOrgId && resolvedOrgId !== domain.activeOrgId) {
      domain.setActiveOrgId(resolvedOrgId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopParam]);

  useEffect(() => {
    if (personaParam && personaParam !== domain.personaKey && PERSONAS[personaParam]) {
      domain.setPersonaKey(personaParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personaParam]);

  const handleViewChange = (next: WorkspaceView) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", next);
    router.push(`${pathname}?${params.toString()}`);
  };

  let shopName = "Unknown Shop";
  let timezone: string | null = null;
  let idleTimeoutMinutes: number | null = null;
  try {
    const org = domain.store.getOrganization(domain.principal, domain.activeOrgId);
    shopName = org.name;
    timezone = org.timezone;
    idleTimeoutMinutes = org.idle_timeout_minutes;
  } catch (err) {
    if (!(err instanceof CrossTenantNotFoundError)) throw err;
  }

  const activeSectionLabel = FOUNDATION_TABS.find((tab) => tab.key === view)?.label ?? "";

  return (
    <div className="flex h-screen overflow-hidden bg-[#f9fafb]">
      <AppShellNav activeView={view} />
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#e4e7ec] bg-white px-5">
          <div className="flex min-w-0 items-center gap-3">
            <p className="truncate text-sm font-semibold text-[#101828]">
              {shopName} <span className="text-[#98a2b3]">›</span> {activeSectionLabel}
            </p>
            {timezone && idleTimeoutMinutes !== null && (
              <StatusPill label={`${timezone} · Idle sign-out · ${idleTimeoutMinutes}m`} color="gray" />
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <div className="inline-flex gap-0.5 rounded-lg bg-[#f2f4f7] p-0.5">
              {FOUNDATION_TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleViewChange(tab.key)}
                  className={clsx(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    view === tab.key ? "bg-white text-[#101828] shadow-xs" : "text-[#667085] hover:text-[#344054]",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </header>
        <div className="flex min-h-0 flex-1">
          {view === "team" && <TeamView />}
          {view === "audit-log" && <AuditLogView />}
          {view === "settings" && <SettingsView />}
        </div>
      </div>
      <IdleTimeoutModal />
      <TweaksPill />
    </div>
  );
}
