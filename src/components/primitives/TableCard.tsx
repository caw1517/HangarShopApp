import { clsx } from "clsx";

/** Untitled UI table card container: rounded-xl white surface with 1px hairline rows. */
export function TableCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx("overflow-hidden rounded-xl bg-white shadow-xs ring-1 ring-inset ring-[#e4e7ec]", className)}>
      {children}
    </div>
  );
}

export function TableCardHeaderRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#e4e7ec] bg-[#f9fafb]/70 px-4 py-2.5 text-xs font-medium text-[#667085]">
      {children}
    </div>
  );
}

export function TableCardRow({
  children,
  active,
  onClick,
  className,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={clsx(
        "flex w-full flex-col gap-1 border-b border-[#e4e7ec] px-4 py-3 text-left last:border-b-0",
        onClick && "cursor-pointer hover:bg-[#f9fafb]",
        active && "bg-[#f2f4f7]/90",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
