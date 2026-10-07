import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { tileClass } from "@/components/design-kit";
import { Skeleton } from "@/components/ui/skeleton";

/** Shared building blocks for app pages, matching the login and dashboard design. */

const PILL_TONE: Record<"success" | "gold" | "danger" | "neutral", string> = {
  success: "border-success/30 bg-success/10 text-success",
  gold: "border-gold/40 bg-gold/15 text-gold-foreground dark:text-gold",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
  neutral: "border-border/60 bg-muted/70 text-muted-foreground",
};

export function StatusPill({
  tone,
  children,
}: {
  tone: keyof typeof PILL_TONE;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${PILL_TONE[tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

export function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  badge,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="bg-navy grid h-10 w-10 shrink-0 place-items-center rounded-lg">
          <Icon className="h-4 w-4 text-gold" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-bold">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {badge}
    </div>
  );
}

/** Inline placeholder for a stat number that is still loading. */
export function SkeletonValue({ className = "h-7 w-16" }: { className?: string }) {
  return (
    <>
      <Skeleton className={`inline-block align-middle ${className}`} />
      <span className="sr-only">Loading</span>
    </>
  );
}

/** Card placeholders shaped like the record tiles (name, pill, two lines). */
export function TileSkeletons({ count = 3, label }: { count?: number; label: string }) {
  return (
    <>
      <span role="status" className="sr-only">
        {label}
      </span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={tileClass}>
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="mt-3 h-3 w-3/5" />
          <Skeleton className="mt-2 h-3 w-4/5" />
        </div>
      ))}
    </>
  );
}

/** List row placeholders with a round avatar, for conversations and short lists. */
export function RowSkeletons({
  count = 4,
  label,
  avatar = true,
  className = "flex items-center gap-3 px-3 py-3.5 sm:gap-4 sm:px-4",
}: {
  count?: number;
  label: string;
  avatar?: boolean;
  className?: string;
}) {
  return (
    <>
      <span role="status" className="sr-only">
        {label}
      </span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={className}>
          {avatar && <Skeleton className="h-11 w-11 shrink-0 rounded-full" />}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-4" style={{ width: `${45 - (index % 3) * 8}%` }} />
              <Skeleton className="h-3 w-10" />
            </div>
            <Skeleton className="h-3" style={{ width: `${75 - (index % 2) * 15}%` }} />
          </div>
        </div>
      ))}
    </>
  );
}

/** Table row placeholders; render inside <tbody>. */
export function TableSkeletonRows({
  rows = 5,
  columns,
  label,
  cellClassName = "px-4 py-4",
}: {
  rows?: number;
  columns: number;
  label: string;
  cellClassName?: string;
}) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <tr key={row} className="border-t border-border/60">
          {Array.from({ length: columns }, (_, column) => (
            <td key={column} className={cellClassName}>
              {row === 0 && column === 0 && (
                <span role="status" className="sr-only">
                  {label}
                </span>
              )}
              <Skeleton
                className="h-3.5"
                style={{ width: `${column === 0 ? 70 : 40 + ((row + column) % 3) * 15}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
