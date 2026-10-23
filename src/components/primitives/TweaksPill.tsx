"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDomain } from "@/lib/domain/context";
import { PERSONA_ORDER, PERSONAS, type PersonaKey } from "@/lib/domain/personas";

export function TweaksPill() {
  const [expanded, setExpanded] = useState(false);
  const domain = useDomain();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handlePersonaChange = (key: PersonaKey) => {
    domain.setPersonaKey(key);
    const params = new URLSearchParams(searchParams.toString());
    params.set("persona", key);
    router.push(`${pathname}?${params.toString()}`);
  };

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="fixed bottom-3 right-3 z-40 bg-gray-900/80 text-white text-[11px] font-medium px-2.5 py-1 rounded-full shadow-sm hover:bg-gray-900"
      >
        Tweaks
      </button>
    );
  }

  return (
    <div className="fixed bottom-3 right-3 z-40 w-64 rounded-xl bg-white p-3 shadow-lg ring-1 ring-inset ring-[#e4e7ec]">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[#101828]">Tweaks</p>
        <button type="button" onClick={() => setExpanded(false)} className="text-xs text-[#667085] hover:text-[#344054]">
          Close
        </button>
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-[11px] font-medium text-[#667085]">Persona / role switcher</label>
        <select
          value={domain.personaKey}
          onChange={(e) => handlePersonaChange(e.target.value as PersonaKey)}
          className="w-full appearance-none rounded-md border border-[#d0d5dd] bg-white px-2.5 py-1.5 text-sm font-medium text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#155eef]"
        >
          {PERSONA_ORDER.map((key) => (
            <option key={key} value={key}>
              {PERSONAS[key].label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={domain.idlePreviewWarning}
        className="uui-btn-secondary mt-3 w-full rounded-lg px-3 py-2 text-sm font-medium"
      >
        Preview idle warning
      </button>
    </div>
  );
}
