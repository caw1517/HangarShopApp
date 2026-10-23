"use client";

import { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AppShellNav } from "@/components/primitives/AppShellNav";
import { IdleTimeoutModal } from "@/components/primitives/IdleTimeoutModal";
import { PreviewWorkspace } from "@/components/primitives/PreviewWorkspace";
import { TweaksPill } from "@/components/primitives/TweaksPill";
import { AuditLogView } from "@/components/views/AuditLogView";
import { SettingsView } from "@/components/views/SettingsView";
import { TeamView } from "@/components/views/TeamView";
import { DomainProvider, useDomain } from "@/lib/domain/context";
import { PERSONAS, type PersonaKey } from "@/lib/domain/personas";
import { ORG_ID_BY_SLUG } from "@/lib/domain/seed";
import type { PreviewSection, WorkspaceView } from "@/components/primitives/workspace";

export interface ViewChrome {
  activeView: WorkspaceView;
  onSelectView: (view: WorkspaceView) => void;
  onPreviewIdle: () => void;
}

const PREVIEW_SECTIONS: PreviewSection[] = [
  "dashboard",
  "tools",
  "consumables",
  "locations",
  "audits",
  "fleet",
  "workorders",
];

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
  const sectionParam = searchParams.get("section");
  const previewSection: PreviewSection | null =
    sectionParam && PREVIEW_SECTIONS.includes(sectionParam as PreviewSection) ? (sectionParam as PreviewSection) : null;
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

  const onSelectView = useCallback(
    (next: WorkspaceView) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("view", next);
      params.delete("section");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const onSelectSection = useCallback(
    (section: PreviewSection) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("section", section);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const onBackToAdmin = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("section");
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams]);

  const chrome: ViewChrome = {
    activeView: view,
    onSelectView,
    onPreviewIdle: domain.idlePreviewWarning,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f9fafb]">
      <AppShellNav
        activeView={view}
        activeSection={previewSection}
        onSelectView={onSelectView}
        onSelectSection={onSelectSection}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {previewSection ? (
          <PreviewWorkspace section={previewSection} onBack={onBackToAdmin} />
        ) : (
          <>
            {view === "team" && <TeamView chrome={chrome} />}
            {view === "audit-log" && <AuditLogView chrome={chrome} />}
            {view === "settings" && <SettingsView chrome={chrome} />}
          </>
        )}
      </div>
      <IdleTimeoutModal />
      <TweaksPill />
    </div>
  );
}
