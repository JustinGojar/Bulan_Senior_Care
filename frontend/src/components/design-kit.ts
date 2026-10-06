/** Shared class names for app pages, matching the login and dashboard design. */

export type Tone = "navy" | "gold" | "success" | "coral";

export const TONE_ICON: Record<Tone, string> = {
  navy: "bg-navy text-white",
  gold: "bg-gold text-gold-foreground",
  success: "bg-success text-success-foreground",
  coral: "bg-coral text-coral-foreground",
};

export const TONE_BAR: Record<Tone, string> = {
  navy: "bg-navy",
  gold: "bg-gold",
  success: "bg-success",
  coral: "bg-coral",
};

export const panelClass = "surface-card border border-border/60";

export const statCardClass =
  "surface-card group relative flex flex-col overflow-hidden border border-border/60 p-4 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)] focus-visible:outline-2 focus-visible:outline-ring sm:p-5";

export const tileClass = "rounded-lg border border-border/60 bg-background/60 p-4";

export const badgeClass =
  "rounded-full border border-border/60 bg-muted/70 px-3 py-1 text-xs font-semibold text-muted-foreground";

export const fieldClass =
  "w-full rounded-lg border border-input bg-background/60 px-4 text-sm text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/80 focus:border-ring focus:ring-4 focus:ring-ring/15";

export const iconButtonClass =
  "grid h-9 w-9 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors hover:text-foreground";

export const primaryButtonClass =
  "bg-navy inline-flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold text-white shadow-[var(--shadow-soft)] disabled:cursor-not-allowed disabled:opacity-70";

export const secondaryButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60";
