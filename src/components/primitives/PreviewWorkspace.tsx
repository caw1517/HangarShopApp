"use client";

import { ArrowLeft } from "@/components/primitives/icons";
import { StatusPill } from "@/components/primitives/StatusPill";
import type { PreviewSection } from "@/components/primitives/workspace";

interface SectionContent {
  title: string;
  subtitle: string;
  blurb: string;
  metrics: Array<{ label: string; value: string; sub: string }>;
}

const CONTENT: Record<PreviewSection, SectionContent> = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Shop overview",
    blurb:
      "The Dashboard rolls up calibration, consumable, and audit health into a single Shop-wide view. It arrives in a later Slice — the multi-Shop foundation and audit log beneath it are live now.",
    metrics: [
      { label: "Open work orders", value: "5", sub: "Across Hangar 1" },
      { label: "Tools tracked", value: "142", sub: "3 calibrations due soon" },
      { label: "Consumable lots", value: "38", sub: "1 lot expired" },
      { label: "Active audits", value: "4", sub: "Cabinet C-04 in progress" },
    ],
  },
  tools: {
    title: "Tools & Calibration",
    subtitle: "142 calibrated & shop tools",
    blurb:
      "Tool register, calibration due-soon tracking, and the overdue quarantine workflow land in a later Slice. Due-soon windows are already configurable per Shop in Shop Settings.",
    metrics: [
      { label: "Tools tracked", value: "142", sub: "Tool Crib A" },
      { label: "Calibration due soon", value: "3", sub: "Within 90 days" },
      { label: "Overdue", value: "1", sub: "Removed from service" },
      { label: "Out for cal", value: "2", sub: "At metrology vendor" },
    ],
  },
  consumables: {
    title: "Consumables & Lots",
    subtitle: "38 active lots · shelf-life tracked",
    blurb:
      "Lot receiving, shelf-life expiry, and cycle-count variance posting arrive in a later Slice. Shelf-life thresholds are already configurable per Shop.",
    metrics: [
      { label: "Active lots", value: "38", sub: "Shelf-life tracked" },
      { label: "Expiring soon", value: "4", sub: "Within 30 days" },
      { label: "Expired", value: "1", sub: "Pending disposal" },
      { label: "Low stock", value: "2", sub: "Below minimum" },
    ],
  },
  locations: {
    title: "Locations",
    subtitle: "Hangar 1 › Tool Crib A › 6 storage spots",
    blurb:
      "The location / lot hierarchy — hangars, cribs, cabinets, drawers, and QR-coded spots — is modeled in a later Slice. Each Shop's locations stay fully isolated from every other Shop.",
    metrics: [
      { label: "Storage spots", value: "6", sub: "Tool Crib A" },
      { label: "Cabinets", value: "1", sub: "Cabinet C-04" },
      { label: "Drawers", value: "4", sub: "D1–D3 · S1" },
      { label: "QR-coded", value: "6", sub: "100% labeled" },
    ],
  },
  audits: {
    title: "Audits & Cycle Counts",
    subtitle: "4 active programs",
    blurb:
      "Cycle counts, facility audits, and the sign-off / segregation flows build on the append-only audit log that is live today. Designated Auditor gating is already enforced per Member.",
    metrics: [
      { label: "Active programs", value: "4", sub: "Hangar 1" },
      { label: "In progress", value: "1", sub: "Cabinet C-04" },
      { label: "Designated auditors", value: "2", sub: "Apex roster" },
      { label: "Verified entries", value: "7", sub: "Append-only log" },
    ],
  },
  fleet: {
    title: "Fleet & Programs",
    subtitle: "3 aircraft programs",
    blurb:
      "Aircraft, maintenance programs, and stale-aircraft alerting arrive in a later Slice. Stale-aircraft thresholds are already configurable per Shop in Shop Settings.",
    metrics: [
      { label: "Aircraft", value: "3", sub: "Part 135 fleet" },
      { label: "Programs", value: "3", sub: "One per tail" },
      { label: "Stale aircraft", value: "0", sub: "Within threshold" },
      { label: "Due inspections", value: "2", sub: "Next 30 days" },
    ],
  },
  workorders: {
    title: "Work Orders",
    subtitle: "Hangar 1 maintenance",
    blurb:
      "Work orders linking tools and consumables to procedure steps land in a later Slice. They will draw on the same per-Shop roles and designations enforced today.",
    metrics: [
      { label: "Open", value: "5", sub: "Hangar 1" },
      { label: "In progress", value: "2", sub: "Assigned" },
      { label: "On hold", value: "1", sub: "Awaiting parts" },
      { label: "Done this week", value: "6", sub: "Closed out" },
    ],
  },
};

export function PreviewWorkspace({ section, onBack }: { section: PreviewSection; onBack: () => void }) {
  const content = CONTENT[section];
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#f9fafb]">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-[#e4e7ec] bg-white px-5">
        <div className="flex items-baseline gap-2.5">
          <span className="text-sm font-semibold text-[#101828]">{content.title}</span>
          <span className="hidden text-xs text-[#64748b] sm:inline">{content.subtitle}</span>
        </div>
        <button type="button" onClick={onBack} className="uui-btn-secondary inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-xs font-medium">
          <ArrowLeft className="h-3.5 w-3.5 text-[#667085]" />
          Back to Administration
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-[#e4e7ec] bg-white p-5 shadow-[0_1px_2px_rgba(10,13,18,0.04)]">
          <div className="max-w-2xl">
            <h2 className="text-base font-semibold text-[#101828]">{content.title}</h2>
            <p className="mt-1.5 text-sm text-[#475467]">{content.blurb}</p>
          </div>
          <StatusPill label="Planned Slice" color="gray" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {content.metrics.map((metric) => (
            <div key={metric.label} className="rounded-xl border border-[#e4e7ec] bg-white p-5 shadow-[0_1px_2px_rgba(10,13,18,0.04)]">
              <div className="text-xs font-medium text-[#667085]">{metric.label}</div>
              <div className="mt-1.5 text-2xl font-semibold tabular-nums text-[#101828]">{metric.value}</div>
              <div className="mt-1 text-xs text-[#667085]">{metric.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
