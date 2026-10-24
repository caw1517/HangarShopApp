"use client";

import { clsx } from "clsx";
import { ChevronDown, Search, SlidersHorizontal } from "@/components/primitives/icons";
import { FilterLines } from "@untitledui/icons";
import { StatusPill, VerificationSquare, type VerificationState } from "@/components/primitives/StatusPill";
import { FOUNDATION_TABS, type WorkspaceView } from "@/components/primitives/workspace";

/* ------------------------------------------------------------------------- */
/* 1. Single-row top context header (h-14)                                   */
/* ------------------------------------------------------------------------- */

export interface ContextHeaderProps {
  title: string;
  subtitle: string;
  activeView: WorkspaceView;
  onSelectView: (view: WorkspaceView) => void;
  search: string;
  onSearch: (value: string) => void;
  searchPlaceholder: string;
  primary?: { label: string; onClick: () => void; disabled?: boolean };
}

export function ContextHeaderBar({
  title,
  subtitle,
  activeView,
  onSelectView,
  search,
  onSearch,
  searchPlaceholder,
  primary,
}: ContextHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[#e4e7ec] bg-white px-5">
      <div className="flex min-w-0 items-center gap-5">
        <div className="flex min-w-0 items-baseline gap-2.5 truncate">
          <h1 className="text-base font-semibold text-[#101828]">{title}</h1>
          <span className="hidden truncate text-xs text-[#64748b] sm:inline">{subtitle}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-lg bg-[#f2f4f7] p-0.5">
          {FOUNDATION_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onSelectView(tab.key)}
              className={clsx(
                "whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition",
                activeView === tab.key ? "bg-white text-[#101828] shadow-2xs" : "text-[#64748b] hover:text-[#101828]",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <div className="relative hidden w-56 md:block">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#64748b]" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-8 w-full rounded-md border border-[#e4e7ec] bg-[#f8fafc] pl-8 pr-3 text-xs text-[#101828] placeholder:text-[#64748b] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#155eef]"
          />
        </div>
        {primary && (
          <button
            type="button"
            onClick={primary.onClick}
            disabled={primary.disabled}
            className="uui-btn-primary inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            {primary.label}
          </button>
        )}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------------- */
/* 2. Secondary MaintainX filter bar (h-11)                                  */
/* ------------------------------------------------------------------------- */

export interface FilterPill {
  label: string;
  value: string;
  onClick: () => void;
  active?: boolean;
}

export interface WorkspaceFilterBarProps {
  scopeLabel: string;
  scopeCount: string;
  pills: FilterPill[];
  rightCount: string;
  rightAction?: "select";
}

export function WorkspaceFilterBar({ scopeLabel, scopeCount, pills, rightCount }: WorkspaceFilterBarProps) {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-[#e4e7ec] bg-[#f9fafb] px-5">
      <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
        <span className="uui-btn-secondary inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium">
          <span className="text-[#344054]">{scopeLabel}</span>
          <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-gray-700 ring-1 ring-inset ring-gray-200">
            {scopeCount}
          </span>
        </span>
        <span className="mx-0.5 h-4 w-[1px] shrink-0 bg-[#e4e7ec]" />
        <span className="inline-flex items-center gap-1.5 pr-1 text-xs font-medium text-[#475467]">
          <SlidersHorizontal className="h-3.5 w-3.5 text-[#667085]" />
          <span>Filters</span>
        </span>
        {pills.map((pill) => (
          <button
            key={pill.label}
            type="button"
            onClick={pill.onClick}
            className={clsx(
              "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium shadow-[0_1px_2px_rgba(10,13,18,0.04)] transition",
              pill.active
                ? "bg-[#f9fafb] ring-1 ring-inset ring-[#101828]"
                : "bg-white ring-1 ring-inset ring-[#d0d5dd] hover:bg-[#f9fafb]",
            )}
          >
            <span className="font-normal text-[#667085]">{pill.label}:</span>
            <span className="font-medium text-[#101828]">{pill.value}</span>
            <ChevronDown className="h-3 w-3 text-[#667085]" />
          </button>
        ))}
      </div>

      <div className="flex shrink-0 items-center gap-3 text-xs">
        <span className="hidden items-center gap-1.5 text-[11px] text-gray-500 lg:inline-flex">
          <kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-gray-500 ring-1 ring-inset ring-gray-200">J</kbd>
          <kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-gray-500 ring-1 ring-inset ring-gray-200">K</kbd>
          <span>navigate</span>
          <span className="text-gray-300">·</span>
          <kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-gray-500 ring-1 ring-inset ring-gray-200">↵</kbd>
          <span>select</span>
        </span>
        <span className="hidden h-3.5 w-[1px] bg-[#e4e7ec] lg:inline" />
        <span className="tabular-nums text-[#667085]">{rightCount}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* 3. Three-column split body + middle list column scaffolding               */
/* ------------------------------------------------------------------------- */

/** Flex frame: middle list column (fixed width) + right detail inspector. */
export function SplitBody({ list, detail }: { list: React.ReactNode; detail: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex w-full flex-col border-b border-[#e4e7ec] bg-white lg:w-[380px] lg:shrink-0 lg:border-b-0 lg:border-r xl:w-[420px]">
        {list}
      </div>
      <div className="hidden min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white lg:flex">{detail}</div>
    </div>
  );
}

/**
 * Scrollable region of the right inspector. Pair it with a sibling
 * `DetailFooter` so the body scrolls independently while the footer stays
 * pinned to the bottom of the inspector (the page itself never scrolls).
 */
export function DetailScroll({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">{children}</div>;
}

export interface ListColumnHeaderProps {
  title: string;
  metric: string;
  /** Optional progress bar (0–100). Omit for lists that aren't a % of a whole. */
  progressPct?: number;
  tabs: Array<{ key: string; label: string }>;
  activeTab: string;
  onSelectTab: (key: string) => void;
}

export function ListColumnHeader({ title, metric, progressPct, tabs, activeTab, onSelectTab }: ListColumnHeaderProps) {
  return (
    <div className="space-y-2.5 border-b border-[#e4e7ec] px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-[#101828]">{title}</span>
        <span className="shrink-0 text-xs tabular-nums text-[#64748b]">{metric}</span>
      </div>
      {progressPct != null && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div className="h-full bg-[#155eef] transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      )}
      <div className={clsx("grid rounded-lg bg-[#f2f4f7] p-0.5", tabs.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onSelectTab(tab.key)}
            className={clsx(
              "rounded-md py-1 text-xs font-medium tabular-nums transition",
              activeTab === tab.key ? "bg-white text-[#101828] shadow-2xs" : "text-[#64748b] hover:text-[#101828]",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export interface ListRowProps {
  selected: boolean;
  onClick: () => void;
  state: VerificationState;
  line1: React.ReactNode;
  line2: React.ReactNode;
  pill: React.ReactNode;
  subLabel?: string;
  /** Overrides the leading square's hover tooltip (e.g. a neutral "Recorded"). */
  squareTitle?: string;
}

export function ListRow({ selected, onClick, state, line1, line2, pill, subLabel, squareTitle }: ListRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex w-full items-start gap-3 px-4 py-3.5 text-left transition",
        selected ? "bg-gray-100" : "bg-white hover:bg-gray-50",
      )}
    >
      <div className="mt-0.5">
        <VerificationSquare state={state} title={squareTitle} />
      </div>
      <div className="min-w-0 flex-1">
        <div className={clsx("truncate text-[13.5px] text-[#101828]", selected ? "font-semibold" : "font-medium")}>{line1}</div>
        <div className="mt-0.5 truncate text-xs tabular-nums text-[#64748b]">{line2}</div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {pill}
        {subLabel && <span className="text-[11px] tabular-nums text-[#64748b]">{subLabel}</span>}
      </div>
    </button>
  );
}

export function ListScroll({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 divide-y divide-[#e4e7ec] overflow-y-auto">{children}</div>;
}

/* ------------------------------------------------------------------------- */
/* 4. Right detail inspector scaffolding                                     */
/* ------------------------------------------------------------------------- */

export function DetailTopBar({ breadcrumb, actions }: { breadcrumb: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#f1f5f9] px-7 pb-3 pt-5">
      <div className="text-xs text-[#64748b]">{breadcrumb}</div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function DetailHeaderBlock({
  icon,
  title,
  meta,
  pill,
}: {
  icon: React.ReactNode;
  title: string;
  meta: React.ReactNode;
  pill?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-7 pt-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-xs font-semibold text-gray-700 ring-1 ring-inset ring-gray-200">
        {icon}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <h2 className="text-lg font-semibold leading-snug text-[#101828]">{title}</h2>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs tabular-nums text-[#64748b]">{meta}</div>
      </div>
      {pill && <div className="shrink-0">{pill}</div>}
    </div>
  );
}

export function MetadataGrid({ items }: { items: Array<{ label: string; value: React.ReactNode }> }) {
  return (
    <div className="grid grid-cols-2 gap-4 rounded-lg border border-[#eaecf0] bg-[#f9fafb] p-3.5 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label}>
          <div className="text-xs font-medium text-[#64748b]">{item.label}</div>
          <div className="mt-0.5 text-sm font-medium text-[#101828]">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function DetailFooter({ left, children }: { left: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#eaecf0] bg-white py-3.5 pl-7 pr-28">
      <div className="space-y-0.5">{left}</div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

/** Shared "no access to this Shop" empty state for cross-tenant personas. */
export function AccessDeniedPanel({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center p-10 text-center">
      <div>
        <p className="text-sm font-semibold text-[#101828]">No access to this Shop</p>
        <p className="mt-1 max-w-sm text-sm text-[#667085]">{message}</p>
      </div>
    </div>
  );
}

/** Re-exported so views build the full chrome from one import. */
export { StatusPill };
export type { VerificationState };
