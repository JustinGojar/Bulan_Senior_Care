import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { panelClass } from "@/components/design-kit";

/**
 * Full-screen card for unauthorized, not-found and error states. It renders
 * outside AppShell, so it brings its own background and logo.
 */
export function StatusPage({
  icon: Icon,
  tone,
  code,
  title,
  children,
  actions,
}: {
  icon: LucideIcon;
  tone: "danger" | "gold";
  code?: string;
  title: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  const toneClass =
    tone === "danger"
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : "border-gold/40 bg-gold/15 text-gold-foreground dark:text-gold";

  return (
    <div className="bg-app relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-background/40 backdrop-blur-[2px]" />
      <main
        className={`${panelClass} relative w-full max-w-lg overflow-hidden p-8 text-center sm:p-10`}
      >
        <div className="flex items-center justify-center gap-3">
          <BrandLogo className="h-10 w-10 ring-2 ring-gold/70" />
          <div className="text-left">
            <p className="font-display text-sm font-bold">Bulan SeniorCare</p>
            <p className="text-xs text-muted-foreground">OSCA · Municipality of Bulan</p>
          </div>
        </div>
        <span
          className={`mx-auto mt-8 grid h-14 w-14 place-items-center rounded-lg border ${toneClass}`}
        >
          <Icon className="h-7 w-7" />
        </span>
        {code && (
          <p className="font-display mt-5 text-5xl font-extrabold tracking-tight text-muted-foreground/40">
            {code}
          </p>
        )}
        <h1 className={`${code ? "mt-1" : "mt-5"} text-3xl font-extrabold`}>{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{children}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">{actions}</div>
      </main>
    </div>
  );
}
