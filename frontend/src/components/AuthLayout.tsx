import { AlertCircle, CheckCircle2, Clock, HeartHandshake, ShieldCheck, Users } from "lucide-react";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import seniorCitizensPhoto from "@/images/img.webp";

export const authInputClass =
  "h-12 w-full rounded-lg border border-input bg-background/60 pr-4 pl-11 text-sm text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/80 focus:border-ring focus:ring-4 focus:ring-ring/15";

export const authSubmitClass =
  "bg-navy group flex h-12 w-full items-center justify-center gap-2 rounded-lg text-sm font-bold text-white shadow-[var(--shadow-soft)] transition-[background-color,color,transform,box-shadow] duration-200 outline-none focus-visible:ring-4 focus-visible:ring-[oklch(0.45_0.08_258)]/35 enabled:hover:-translate-y-0.5 enabled:hover:bg-[oklch(0.45_0.08_258)] enabled:hover:bg-none enabled:hover:shadow-[0_12px_28px_-8px_rgb(0_0_0/0.35)] enabled:active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70";

const highlights = [
  { icon: Users, label: "Senior citizen profiling across every barangay" },
  { icon: HeartHandshake, label: "Benefits, eligibility, and service tracking" },
  { icon: ShieldCheck, label: "Secure, role-based access for OSCA staff" },
];

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-app relative grid min-h-screen place-items-center px-4 pt-20 pb-8 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-background/40 backdrop-blur-[2px]" />
      <ThemeToggle className="absolute top-5 right-5 z-10" />

      <div className="surface-card relative grid w-full max-w-5xl overflow-hidden border border-border/60 lg:grid-cols-[1.05fr_1fr]">
        {/* Brand panel */}
        <aside className="relative hidden overflow-hidden text-white lg:flex lg:flex-col">
          <img
            src={seniorCitizensPhoto}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.24_0.06_258/0.82)] via-[oklch(0.26_0.06_258/0.88)] to-[oklch(0.2_0.05_258/0.97)]" />

          <div className="relative flex h-full flex-col p-10">
            <div className="flex items-center gap-3">
              <BrandLogo className="h-12 w-12 ring-2 ring-gold/80" />
              <div>
                <p className="font-display text-base font-bold">Bulan SeniorCare</p>
                <p className="text-xs opacity-75">OSCA · Municipality of Bulan, Sorsogon</p>
              </div>
            </div>

            <div className="mt-auto pt-16">
              <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/15 px-3 py-1 text-[11px] font-semibold tracking-wider text-gold uppercase">
                Office of Senior Citizens Affairs
              </span>
              <p className="font-display mt-5 text-4xl leading-tight font-extrabold tracking-[-0.02em]">
                Profile. Monitor.
                <br />
                <span className="text-gold">Serve better.</span>
              </p>
              <p className="mt-4 max-w-sm text-sm leading-relaxed opacity-85">
                One portal for senior citizen records, benefits, and services across every barangay
                in Bulan.
              </p>

              <ul className="mt-8 space-y-3">
                {highlights.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-3 text-sm">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15">
                      <Icon className="h-4 w-4 text-gold" />
                    </span>
                    <span className="opacity-90">{label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </aside>

        {/* Form panel */}
        <main className="flex flex-col justify-center bg-card px-6 py-10 sm:px-12 sm:py-14">
          <div className="flex items-center gap-3 lg:hidden">
            <BrandLogo className="h-11 w-11 ring-2 ring-gold/70" />
            <div>
              <p className="font-display text-sm font-bold">Bulan SeniorCare</p>
              <p className="text-xs text-muted-foreground">OSCA · Municipality of Bulan</p>
            </div>
          </div>

          <div className="mt-8 lg:mt-0">
            <h1 className="text-3xl font-extrabold sm:text-[2rem]">{title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          </div>

          {children}

          <p className="mt-8 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} OSCA Bulan · Bulan SeniorCare Portal
          </p>
        </main>
      </div>
    </div>
  );
}

export function AuthAlert({
  tone,
  children,
}: {
  tone: "error" | "success" | "info";
  children: ReactNode;
}) {
  const Icon = tone === "error" ? AlertCircle : tone === "info" ? Clock : CheckCircle2;
  // Tints are mixed into the card color so the alert stays solid over the page photo.
  const toneClass =
    tone === "error"
      ? "border-destructive/30 bg-[color-mix(in_oklab,var(--color-destructive)_10%,var(--color-card))] text-destructive"
      : tone === "info"
        ? "border-gold/40 bg-[color-mix(in_oklab,var(--color-gold)_15%,var(--color-card))] text-gold-foreground dark:text-gold"
        : "border-success/30 bg-[color-mix(in_oklab,var(--color-success)_10%,var(--color-card))] text-success";

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${toneClass}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="font-medium">{children}</span>
    </div>
  );
}
