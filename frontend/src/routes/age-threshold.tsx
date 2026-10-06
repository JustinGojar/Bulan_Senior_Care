import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, Loader2, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthAlert } from "@/components/AuthLayout";
import { SectionHeader, StatusPill } from "@/components/DesignKit";
import {
  TONE_BAR,
  badgeClass,
  panelClass,
  statCardClass,
  tileClass,
} from "@/components/design-kit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getStoredUser } from "@/lib/api";
import {
  BENEFIT_PROGRAMS,
  findNewEligibilityFlags,
  type BenefitProgram,
  type Senior,
} from "@/lib/osca-data";
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
        .filter(
          (senior) =>
            senior.age >= selectedProgram.minAge &&
            (selectedProgram.maxAge === undefined || senior.age <= selectedProgram.maxAge),
        )
        .sort((first, second) => first.age - second.age || first.name.localeCompare(second.name))
    : [];

  const inBracket = (program: BenefitProgram) =>
    seniors.filter(
      (senior) =>
        senior.age >= program.minAge &&
        (program.maxAge === undefined || senior.age <= program.maxAge),
    ).length;

  return (
    <AppShell
      title="Age Threshold"
      subtitle="Review age brackets and newly eligible senior citizens"
      breadcrumb={["Dashboard", "Age Threshold"]}
    >
      <section className={`${panelClass} p-5 sm:p-7`}>
        <SectionHeader
          icon={SlidersHorizontal}
          title="Configured age brackets"
          subtitle="Current benefit thresholds used for eligibility detection. Select one to see its seniors."
        />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {programs.map((program) => (
            <button
              key={program.type}
              type="button"
              onClick={() => setSelectedProgram(program)}
              aria-label={`Show seniors aged ${program.minAge}${program.maxAge ? ` to ${program.maxAge}` : " and older"}`}
              className={`${statCardClass} text-left`}
            >
              <span className={`absolute inset-x-0 top-0 h-1 ${TONE_BAR.gold}`} />
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase sm:text-xs">
                  {program.maxAge === undefined
                    ? "No upper limit"
                    : program.maxAge === program.minAge
                      ? `Age ${program.minAge}`
                      : `Ages ${program.minAge}–${program.maxAge}`}
                </p>
                <span className={badgeClass}>
                  {loading
                    ? "..."
                    : `${inBracket(program).toLocaleString()} ${inBracket(program) === 1 ? "senior" : "seniors"}`}
                </span>
              </div>
              <p className="font-display mt-2 text-3xl leading-none font-extrabold">
                {program.minAge}+
              </p>
              <p className="mt-3 text-sm font-bold">{program.name}</p>
              <p className="mt-1 text-sm font-semibold text-coral">{program.amount}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                View seniors
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className={`${panelClass} mt-6 p-5 sm:p-7`}>
        <SectionHeader
          icon={AlertTriangle}
          title="New threshold flags"
          subtitle="Seniors who currently match a one-time age-based benefit."
          badge={
            <StatusPill tone="gold">{loading ? "Loading..." : `${flags.length} flags`}</StatusPill>
          }
        />
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {flags.map(({ senior, program, reason }) => (
            <article key={`${senior.id}-${program.type}`} className={tileClass}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-bold">{senior.name}</p>
                <span className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-xs font-bold text-gold-foreground dark:text-gold">
                  Age {senior.age}
                </span>
              </div>
              <p className="mt-2 text-xs font-semibold text-coral">{program.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{reason}</p>
            </article>
          ))}
          {loading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading senior records...
            </p>
          )}
          {!loading && loadError && (
            <div className="md:col-span-2 xl:col-span-3">
              <AuthAlert tone="error">Could not load senior records. Please try again.</AuthAlert>
            </div>
          )}
          {!loading && !loadError && flags.length === 0 && (
            <p className="text-sm text-muted-foreground">No new age threshold flags.</p>
          )}
        </div>
      </section>

      <Dialog
        open={selectedProgram !== null}
        onOpenChange={(open) => !open && setSelectedProgram(null)}
      >
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">{selectedProgram?.name}</DialogTitle>
            <DialogDescription>
              {selectedProgram &&
                `Senior records aged ${selectedProgram.minAge}${selectedProgram.maxAge ? `-${selectedProgram.maxAge}` : " and older"}.`}
            </DialogDescription>
          </DialogHeader>
          {loading ? (
            <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading senior records...
            </p>
          ) : loadError ? (
            <AuthAlert tone="error">Could not load senior records. Please try again.</AuthAlert>
          ) : selectedSeniors.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No senior records fall within this age range.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {selectedSeniors.length} {selectedSeniors.length === 1 ? "senior" : "seniors"}
              </p>
              <div className="max-h-[55dvh] space-y-2 overflow-y-auto">
                {selectedSeniors.map((senior) => (
                  <article
                    key={senior.id}
                    className={`${tileClass} flex flex-wrap items-center justify-between gap-2 p-3`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{senior.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {senior.id} · {senior.barangay}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-gold/15 px-3 py-1 text-xs font-bold text-gold-foreground dark:text-gold">
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
