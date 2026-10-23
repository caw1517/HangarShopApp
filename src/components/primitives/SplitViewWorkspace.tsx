import { Children } from "react";

/**
 * Canonical 2-pane workspace body (middle filterable list + right detail/inspector pane)
 * that sits to the right of <AppShellNav />, together forming the 3-column desktop
 * architecture at 1440x900. Stacks vertically below the lg breakpoint.
 *
 * Takes exactly two children — [middle pane, detail pane] — rather than named
 * props so callers can keep both panes' markup inside one component closure
 * and share local state (selected row, filters, form drafts) between them.
 */
export function SplitViewWorkspace({ children }: { children: React.ReactNode }) {
  const [middle, detail] = Children.toArray(children);
  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className="flex min-h-0 w-full flex-col overflow-y-auto border-b border-[#e4e7ec] bg-[#f9fafb] lg:w-[400px] lg:shrink-0 lg:border-b-0 lg:border-r">
        {middle}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-[#f9fafb]">{detail}</div>
    </div>
  );
}
