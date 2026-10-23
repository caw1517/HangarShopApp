import { clsx } from "clsx";

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
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-white px-2 py-0.5 text-xs font-medium text-[#344054] ring-1 ring-inset ring-[#e4e7ec] shadow-2xs",
        className,
      )}
    >
      <span className={clsx("h-1.5 w-1.5 shrink-0 rounded-full", DOT_COLOR[color])} aria-hidden />
      {label}
    </span>
  );
}
