import { clsx } from "clsx";
import { AlertCircle, Check, SwitchHorizontal01 } from "@untitledui/icons";

export type StatusDotColor = "green" | "amber" | "red" | "blue" | "purple" | "gray";

type StatusTone = "success" | "warning" | "error" | "info" | "neutral";

// Call sites keep naming the dot color; each maps onto a DESIGN.md §3 tone.
const TONE: Record<StatusDotColor, StatusTone> = {
  green: "success",
  amber: "warning",
  red: "error",
  blue: "info",
  purple: "info",
  gray: "neutral",
};

const TONE_CLASSES: Record<StatusTone, { pill: string; dot: string }> = {
  success: { pill: "bg-success-tint text-success", dot: "bg-success-dot" },
  warning: { pill: "bg-warning-tint text-warning", dot: "bg-warning-dot" },
  error: { pill: "bg-error-tint text-error", dot: "bg-error-dot" },
  info: { pill: "bg-info-tint text-info", dot: "bg-info-dot" },
  neutral: { pill: "bg-slate-100 text-slate-600", dot: "bg-slate-400" },
};

export interface StatusPillProps {
  label: string;
  color: StatusDotColor;
  className?: string;
}

/**
 * Tone-based status pill: tint fill, dark tone text and a 6px dot in the
 * bright hue. The label carries the state; the dot only reinforces it.
 * At most one per row.
 */
export function StatusPill({ label, color, className }: StatusPillProps) {
  const tone = TONE_CLASSES[TONE[color]];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm px-2 py-0.5 text-xs font-medium",
        tone.pill,
        className,
      )}
    >
      <span className={clsx("h-1.5 w-1.5 shrink-0 rounded-full", tone.dot)} aria-hidden />
      {label}
    </span>
  );
}

export type VerificationState = "verified" | "flagged" | "variance" | "unchecked";

/**
 * The small 16px left-rail square that fronts every split-view list row:
 * a checked square for verified/active, a swap glyph for a recorded variance,
 * an alert square for anything needing attention, and an empty square otherwise.
 *
 * `title` overrides the hover tooltip for the "verified" state. The audit log
 * passes a neutral "Recorded" so a check-marked row never reads as an
 * integrity/verification claim about the entry.
 */
export function VerificationSquare({ state, title }: { state: VerificationState; title?: string }) {
  if (state === "verified") {
    return (
      <div
        title={title ?? "Verified"}
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-xs bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-300"
      >
        <Check className="h-3 w-3 stroke-[2.25]" />
      </div>
    );
  }
  if (state === "flagged") {
    return (
      <div
        title="Needs attention"
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-xs bg-error-tint text-error ring-1 ring-inset ring-error"
      >
        <AlertCircle className="h-3 w-3 stroke-[2]" />
      </div>
    );
  }
  if (state === "variance") {
    return (
      <div
        title="Variance recorded"
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-xs bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-300"
      >
        <SwitchHorizontal01 className="h-2.5 w-2.5 stroke-[2]" />
      </div>
    );
  }
  return (
    <div
      title="Remaining"
      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-xs bg-white ring-1 ring-inset ring-slate-300"
    />
  );
}
