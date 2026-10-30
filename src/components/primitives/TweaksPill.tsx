"use client";

import { useId, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "@/components/primitives/icons";
import { useDomain } from "@/lib/domain/context";
import { PERSONA_ORDER, PERSONAS, type PersonaKey } from "@/lib/domain/personas";
import { ORG_APEX_ID, ORG_CASCADE_ID, ORG_SLUG_BY_ID } from "@/lib/domain/seed";

const SHOPS = [
  { id: ORG_APEX_ID, label: "Apex Charter MX · Hangar 1" },
  { id: ORG_CASCADE_ID, label: "Cascade Flight Services" },
];

export function TweaksPill() {
  const [expanded, setExpanded] = useState(false);
  const domain = useDomain();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shopSelectId = useId();
  const roleSelectId = useId();
  const idleDemoLabelId = useId();

  const pushParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleShopChange = (orgId: string) => {
    domain.setActiveOrgId(orgId);
    pushParam("shop", ORG_SLUG_BY_ID[orgId] ?? orgId);
  };

  const handlePersonaChange = (key: PersonaKey) => {
    domain.setPersonaKey(key);
    pushParam("persona", key);
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="fixed bottom-3 right-3 z-50 inline-flex items-center gap-1.5 rounded-sm bg-slate-900/85 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-900"
      >
        <SlidersHorizontal className="h-3 w-3" />
        Tweaks
      </button>
    );
  }

  return (
    <div className="fixed bottom-3 right-3 z-50 w-72 rounded-md bg-slate-900 p-3 text-white shadow-overlay ring-1 ring-inset ring-white/10">
      <div className="flex items-center justify-between">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold">
          <SlidersHorizontal className="h-3.5 w-3.5 text-white/70" />
          Tweaks
        </p>
        <button type="button" onClick={() => setExpanded(false)} className="text-[11px] text-white/60 hover:text-white">
          Close
        </button>
      </div>

      <div className="mt-3 space-y-3">
        <div>
          <label htmlFor={shopSelectId} className="mb-1 block text-[11px] font-medium text-white/55">Shop</label>
          <select
            id={shopSelectId}
            value={domain.activeOrgId}
            onChange={(e) => handleShopChange(e.target.value)}
            className="w-full appearance-none rounded-sm border border-white/10 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-accent-ring"
          >
            {SHOPS.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={roleSelectId} className="mb-1 block text-[11px] font-medium text-white/55">Role</label>
          <select
            id={roleSelectId}
            value={domain.personaKey}
            onChange={(e) => handlePersonaChange(e.target.value as PersonaKey)}
            className="w-full appearance-none rounded-sm border border-white/10 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-accent-ring"
          >
            {PERSONA_ORDER.map((key) => (
              <option key={key} value={key}>
                {PERSONAS[key].label}
              </option>
            ))}
          </select>
        </div>

        <div role="group" aria-labelledby={idleDemoLabelId}>
          <p id={idleDemoLabelId} className="mb-1 block text-[11px] font-medium text-white/55">Idle timeout demo</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={domain.idlePreviewWarning}
              className="flex-1 rounded-sm border border-white/10 bg-slate-800 px-3 py-1.5 text-xs font-medium text-white/90 transition hover:bg-slate-700"
            >
              Preview warning
            </button>
            <button
              type="button"
              onClick={domain.idlePreviewTimeout}
              className="flex-1 rounded-sm border border-white/10 bg-slate-800 px-3 py-1.5 text-xs font-medium text-white/90 transition hover:bg-slate-700"
            >
              Preview timeout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
