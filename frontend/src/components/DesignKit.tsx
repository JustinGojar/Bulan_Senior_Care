import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

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
