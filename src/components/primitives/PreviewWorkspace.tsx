"use client";

import { ArrowLeft } from "@/components/primitives/icons";
import { StatusPill } from "@/components/primitives/StatusPill";
import type { PreviewSection } from "@/components/primitives/workspace";

interface SectionContent {
  title: string;
  subtitle: string;
  blurb: string;
  /** What this module will track once it ships. No counts or sample data —
   * nothing in this slice is backed by real per-Shop records yet. */
  willTrack: string[];
}

const CONTENT: Record<PreviewSection, SectionContent> = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Shop overview",
    blurb:
      "The Dashboard will roll up calibration, consumable, and audit health into a single Shop-wide view.",
    willTrack: ["Calibration status", "Consumable shelf-life", "Open work orders", "Audit activity"],
  },
  tools: {
    title: "Tools & Calibration",
    subtitle: "Calibrated & shop tools",
    blurb:
      "The tool register, calibration due-soon tracking, and the overdue quarantine workflow are on the way. Due-soon windows are already configurable per Shop in Shop Settings.",
    willTrack: ["Tool register", "Calibration due-soon", "Overdue quarantine", "Out for calibration"],
  },
  consumables: {
    title: "Consumables & Lots",
    subtitle: "Shelf-life tracked lots",
    blurb:
      "Lot receiving, shelf-life expiry, and cycle-count variance posting are on the way. Shelf-life thresholds are already configurable per Shop.",
    willTrack: ["Lot receiving", "Shelf-life expiry", "Expired / disposal", "Low-stock alerts"],
  },
  locations: {
    title: "Locations",
    subtitle: "Hangar, crib & cabinet hierarchy",
    blurb:
      "The location / lot hierarchy — hangars, cribs, cabinets, drawers, and QR-coded spots — is on the way. Each Shop's locations stay fully isolated from every other Shop.",
    willTrack: ["Storage hierarchy", "Cabinets & drawers", "QR-coded spots", "Per-Shop isolation"],
  },
  audits: {
    title: "Audits & Cycle Counts",
    subtitle: "Cycle counts & facility audits",
    blurb:
      "Cycle counts, facility audits, and the sign-off / segregation flows build on the append-only audit log that is live today. Designated Auditor gating is already enforced per Member.",
    willTrack: ["Cycle counts", "Facility audits", "Sign-off & segregation", "Designated Auditor gating"],
  },
  imports: {
    title: "Imports",
    subtitle: "CSV & ERP batch sync history",
    blurb:
      "Bulk CSV imports and ERP batch sync — for seeding tools, consumables, and locations — are on the way. Every import will be scoped to the active Shop and recorded in the audit log.",
    willTrack: ["CSV imports", "ERP batch sync", "Row-level review", "Audit-logged runs"],
  },
  fleet: {
    title: "Fleet & Programs",
    subtitle: "Aircraft & maintenance programs",
    blurb:
      "Aircraft, maintenance programs, and stale-aircraft alerting are on the way. Stale-aircraft thresholds are already configurable per Shop in Shop Settings.",
    willTrack: ["Aircraft register", "Maintenance programs", "Stale-aircraft alerts", "Due inspections"],
  },
  workorders: {
    title: "Work Orders",
    subtitle: "Hangar maintenance",
    blurb:
      "Work orders linking tools and consumables to procedure steps are on the way. They will draw on the same per-Shop roles and designations enforced today.",
    willTrack: ["Procedure steps", "Tool & lot draws", "Assignment & status", "Discrepancies"],
  },
};

export function PreviewWorkspace({ section, onBack }: { section: PreviewSection; onBack: () => void }) {
  const content = CONTENT[section];
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5">
        <div className="flex items-baseline gap-2.5">
          <span className="text-sm font-semibold text-slate-900">{content.title}</span>
          <span className="hidden text-xs text-slate-600 sm:inline">{content.subtitle}</span>
        </div>
        <button type="button" onClick={onBack} className="uui-btn-secondary inline-flex h-7 items-center gap-1.5 rounded-sm px-3 text-xs font-medium">
          <ArrowLeft className="h-3.5 w-3.5 text-slate-600" />
          Back to Administration
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-5 flex items-start justify-between gap-4 border border-slate-200 bg-white p-5">
          <div className="max-w-2xl">
            <h2 className="text-base font-semibold text-slate-900">{content.title}</h2>
            <p className="mt-1.5 text-sm text-slate-600">{content.blurb}</p>
          </div>
          <StatusPill label="Coming soon" color="gray" />
        </div>

        <div className="border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-600">What this module will track</p>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {content.willTrack.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-600">No data is tracked here yet.</p>
        </div>
      </div>
    </div>
  );
}
