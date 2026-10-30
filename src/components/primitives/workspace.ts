/** The three live Slice 1 Administration modules, shared by the nav rail,
 * shell header segmented tabs, and the views themselves. */
export type WorkspaceView = "team" | "audit-log" | "settings";

export const FOUNDATION_TABS: Array<{ key: WorkspaceView; label: string }> = [
  { key: "team", label: "Team & Roles" },
  { key: "audit-log", label: "Compliance Audit Log" },
  { key: "settings", label: "Shop Settings" },
];

/** The primary nav destinations beyond Slice 1's live Administration modules,
 * rendered as clean v5.1 preview workspaces so every rail item is live and
 * interactive. */
export type PreviewSection =
  | "dashboard"
  | "tools"
  | "consumables"
  | "locations"
  | "audits"
  | "imports"
  | "fleet"
  | "workorders";
