import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getStoredUser } from "@/lib/api";
import { BENEFIT_PROGRAMS, findNewEligibilityFlags, type BenefitProgram, type Senior } from "@/lib/osca-data";
import { useSeniors } from "@/lib/use-seniors";

export const Route = createFileRoute("/age-threshold")({
  head: () => ({ meta: [{ title: "Age Threshold — Bulan SeniorCare" }] }),
  component: AgeThresholdPage,
});

function AgeThresholdPage() {
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const { loadAllSeniors } = useSeniors({ excludePending: true });
  const [seniors, setSeniors] = useState<Senior[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<BenefitProgram | null>(null);
  useEffect(() => {
    if (currentUser?.role === "leader") navigate({ to: "/dashboard", replace: true });
  }, [currentUser?.role, navigate]);
  useEffect(() => {
    let active = true;
    loadAllSeniors()
      .then((records) => {
        if (active) setSeniors(records);
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadAllSeniors]);
  if (currentUser?.role === "leader") return null;
  const flags = findNewEligibilityFlags(seniors);
  const programs = BENEFIT_PROGRAMS.filter((program) => program.type !== "social_pension");
  const selectedSeniors = selectedProgram
    ? seniors
      .filter((senior) =>
        senior.age >= selectedProgram.minAge &&
        (selectedProgram.maxAge === undefined || senior.age <= selectedProgram.maxAge),
      )
      .sort((first, second) => first.age - second.age || first.name.localeCompare(second.name))
    : [];

  return (
    <AppShell
      title="Age Threshold"
      subtitle="Review age brackets and newly eligible senior citizens"
      breadcrumb={["Dashboard", "Age Threshold"]}
    >
      <section className="surface-card p-5 sm:p-7">
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
            <button
              key={program.type}
              type="button"
              onClick={() => setSelectedProgram(program)}
              aria-label={`Show seniors aged ${program.minAge}${program.maxAge ? ` to ${program.maxAge}` : " and older"}`}
              className="rounded-3xl bg-secondary p-5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <p className="font-display text-3xl font-extrabold">{program.minAge}+</p>
              <p className="mt-2 text-sm font-bold">{program.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {program.maxAge ? `Eligible ages ${program.minAge}-${program.maxAge}` : "No upper age limit"}
              </p>
              <p className="mt-3 text-sm font-semibold text-coral">{program.amount}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="surface-card mt-6 p-5 sm:p-7">
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

      <Dialog open={selectedProgram !== null} onOpenChange={(open) => !open && setSelectedProgram(null)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">{selectedProgram?.name}</DialogTitle>
            <DialogDescription>
              {selectedProgram && `Senior records aged ${selectedProgram.minAge}${selectedProgram.maxAge ? `-${selectedProgram.maxAge}` : " and older"}.`}
            </DialogDescription>
          </DialogHeader>
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading senior records...</p>
          ) : loadError ? (
            <p className="py-6 text-center text-sm text-destructive">
              Could not load senior records. Please try again.
            </p>
          ) : selectedSeniors.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No senior records fall within this age range.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">
                {selectedSeniors.length} {selectedSeniors.length === 1 ? "senior" : "seniors"}
              </p>
              <div className="max-h-[55dvh] space-y-2 overflow-y-auto">
                {selectedSeniors.map((senior) => (
                  <article
                    key={senior.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-secondary p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{senior.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {senior.id} · {senior.barangay}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-card px-3 py-1 text-xs font-bold">
                      Age {senior.age}
                    </span>
                  </article>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
