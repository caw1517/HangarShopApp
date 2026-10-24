import { clsx } from "clsx";
import { AlertCircle, Check, SwitchHorizontal01 } from "@untitledui/icons";

export type StatusDotColor = "green" | "amber" | "red" | "blue" | "purple" | "gray";

const DOT_COLOR: Record<StatusDotColor, string> = {
  green: "bg-[#17b26a]",
  amber: "bg-[#f79009]",
  red: "bg-[#f04438]",
  blue: "bg-[#155eef]",
  purple: "bg-[#6938ef]",
  gray: "bg-[#98a2b3]",
};

export interface StatusPillProps {
  label: string;
  color: StatusDotColor;
  className?: string;
}

/**
 * Untitled UI `Badge type="modern"` — crisp white surface, 1px inset gray ring,
 * dark neutral text, and a 6px semantic leading dot. At most one per row.
 */
export function StatusPill({ label, color, className }: StatusPillProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-white px-2 py-0.5 text-xs font-medium text-[#344054] ring-1 ring-inset ring-[#e4e7ec] shadow-[0_1px_2px_rgba(10,13,18,0.04)]",
        className,
      )}
    >
      <span className={clsx("h-1.5 w-1.5 shrink-0 rounded-full", DOT_COLOR[color])} aria-hidden />
      {label}
    </span>
  );
}

export type VerificationState = "verified" | "flagged" | "variance" | "unchecked";

/**
 * The small 16px left-rail square that fronts every split-view list row in v5.1:
 * a checked square for verified/active, a swap glyph for a recorded variance,
 * an alert square for anything needing attention, and an empty square otherwise.
 */
export function VerificationSquare({ state }: { state: VerificationState }) {
  if (state === "verified") {
    return (
      <div
        title="Verified"
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-300"
      >
        <Check className="h-3 w-3 stroke-[2.25]" />
      </div>
    );
  }
  if (state === "flagged") {
    return (
      <div
        title="Needs attention"
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] bg-[#fef3f2] text-[#d92d20] ring-1 ring-inset ring-[#fecdca]"
      >
        <AlertCircle className="h-3 w-3 stroke-[2]" />
      </div>
    );
  }
  if (state === "variance") {
    return (
      <div
        title="Variance recorded"
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-300"
      >
        <SwitchHorizontal01 className="h-2.5 w-2.5 stroke-[2]" />
      </div>
    );
  }
  return (
    <div
      title="Remaining"
      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] bg-white ring-1 ring-inset ring-gray-300"
    />
  );
}
