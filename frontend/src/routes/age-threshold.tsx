import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { BENEFIT_PROGRAMS, findNewEligibilityFlags } from "@/lib/osca-data";
import { useSeniors } from "@/lib/use-seniors";

export const Route = createFileRoute("/age-threshold")({
  head: () => ({ meta: [{ title: "Age Threshold — Bulan SeniorCare" }] }),
  component: AgeThresholdPage,
});

function AgeThresholdPage() {
  const { seniors, loading } = useSeniors({ excludePending: true });
  const flags = findNewEligibilityFlags(seniors);
  const programs = BENEFIT_PROGRAMS.filter((program) => program.type !== "social_pension");

  return (
    <AppShell
      title="Age Threshold"
      subtitle="Review age brackets and newly eligible senior citizens"
      breadcrumb={["Dashboard", "Age Threshold"]}
    >
      <section className="surface-card p-7">
        <div className="flex items-center gap-3">
          <div className="bg-navy grid h-10 w-10 place-items-center rounded-full text-primary-foreground">
            <SlidersHorizontal className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Configured age brackets</h2>
            <p className="text-sm text-muted-foreground">
              Current benefit thresholds used for eligibility detection.
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {programs.map((program) => (
            <div key={program.type} className="rounded-3xl bg-secondary p-5">
              <p className="font-display text-3xl font-extrabold">{program.minAge}+</p>
              <p className="mt-2 text-sm font-bold">{program.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {program.maxAge ? `Eligible ages ${program.minAge}-${program.maxAge}` : "No upper age limit"}
              </p>
              <p className="mt-3 text-sm font-semibold text-coral">{program.amount}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-card mt-6 p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-gold text-gold-foreground">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold">New threshold flags</h2>
              <p className="text-sm text-muted-foreground">
                Seniors who currently match a one-time age-based benefit.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-gold/20 px-3 py-1 text-xs font-bold text-gold-foreground">
            {loading ? "Loading..." : `${flags.length} flags`}
          </span>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {flags.map(({ senior, program, reason }) => (
            <article key={`${senior.id}-${program.type}`} className="rounded-2xl bg-secondary p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-bold">{senior.name}</p>
                <span className="shrink-0 text-xs font-bold text-gold-foreground">Age {senior.age}</span>
              </div>
              <p className="mt-2 text-xs font-semibold text-coral">{program.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{reason}</p>
            </article>
          ))}
          {loading && <p className="text-sm text-muted-foreground">Loading senior records...</p>}
          {!loading && flags.length === 0 && (
            <p className="text-sm text-muted-foreground">No new age threshold flags.</p>
          )}
        </div>
      </section>
    </AppShell>
  );
}
