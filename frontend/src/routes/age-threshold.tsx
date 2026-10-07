import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthAlert } from "@/components/AuthLayout";
import {
  EmptyState,
  RowSkeletons,
  SectionHeader,
  SkeletonValue,
  StatusPill,
  TileSkeletons,
} from "@/components/DesignKit";
import {
  TONE_BAR,
  badgeClass,
  panelClass,
  secondaryButtonClass,
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
import { cn } from "@/lib/utils";
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

const FLAGS_PER_PAGE = 9;
const SENIORS_PER_PAGE = 10;

function pageCount(total: number, perPage: number) {
  return Math.max(1, Math.ceil(total / perPage));
}

function Pager({
  page,
  total,
  perPage,
  onChange,
}: {
  page: number;
  total: number;
  perPage: number;
  onChange: (page: number) => void;
}) {
  const lastPage = pageCount(total, perPage);
  if (lastPage <= 1) return null;
  return (
    <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page === 1}
        aria-label="Previous page"
        className={`${secondaryButtonClass} h-10 px-3 sm:px-4`}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Previous</span>
      </button>
      <span className="text-center text-sm text-muted-foreground">
        Page <span className="font-semibold text-foreground">{page}</span> of{" "}
        <span className="font-semibold text-foreground">{lastPage}</span>
        <span className="block text-xs">
          Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
        </span>
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(lastPage, page + 1))}
        disabled={page === lastPage}
        aria-label="Next page"
        className={`${secondaryButtonClass} h-10 px-3 sm:px-4`}
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function AgeThresholdPage() {
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const { loadAllSeniors } = useSeniors({ excludePending: true });
  const [seniors, setSeniors] = useState<Senior[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<BenefitProgram | null>(null);
  const [flagsPage, setFlagsPage] = useState(1);
  const [seniorsPage, setSeniorsPage] = useState(1);
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
  const flagsLastPage = pageCount(flags.length, FLAGS_PER_PAGE);
  const currentFlagsPage = Math.min(flagsPage, flagsLastPage);
  const visibleFlags = flags.slice(
    (currentFlagsPage - 1) * FLAGS_PER_PAGE,
    currentFlagsPage * FLAGS_PER_PAGE,
  );
  const seniorsLastPage = pageCount(selectedSeniors.length, SENIORS_PER_PAGE);
  const currentSeniorsPage = Math.min(seniorsPage, seniorsLastPage);
  const visibleSeniors = selectedSeniors.slice(
    (currentSeniorsPage - 1) * SENIORS_PER_PAGE,
    currentSeniorsPage * SENIORS_PER_PAGE,
  );

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
        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3 xl:grid-cols-5">
          {programs.map((program) => (
            <button
              key={program.type}
              type="button"
              onClick={() => {
                setSelectedProgram(program);
                setSeniorsPage(1);
              }}
              aria-label={`Show seniors aged ${program.minAge}${program.maxAge ? ` to ${program.maxAge}` : " and older"}`}
              className={cn(statCardClass, "min-w-0 p-2.5 text-left sm:p-4")}
            >
              <span className={`absolute inset-x-0 top-0 h-1 ${TONE_BAR.gold}`} />
              <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase sm:text-xs">
                  {program.maxAge === undefined
                    ? "No upper limit"
                    : program.maxAge === program.minAge
                      ? `Age ${program.minAge}`
                      : `Ages ${program.minAge}–${program.maxAge}`}
                </p>
                <span className={cn(badgeClass, "max-sm:px-1.5 max-sm:text-[10px]")}>
                  {loading ? (
                    <SkeletonValue className="h-3 w-6 sm:w-12" />
                  ) : (
                    <>
                      {inBracket(program).toLocaleString()}
                      <span className="hidden sm:inline">
                        {inBracket(program) === 1 ? " senior" : " seniors"}
                      </span>
                    </>
                  )}
                </span>
              </div>
              <p className="font-display mt-1.5 text-xl leading-none font-extrabold sm:text-2xl">
                {program.minAge}+
              </p>
              <p className="mt-2 text-xs leading-tight font-bold wrap-break-word sm:text-sm">
                {program.name}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-coral sm:text-xs">
                {program.amount}
              </p>
              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-primary sm:text-xs">
                View<span className="hidden sm:inline"> seniors</span>
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
          {visibleFlags.map(({ senior, program, reason }) => (
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
          {loading && <TileSkeletons label="Loading senior records" />}
          {!loading && loadError && (
            <div className="md:col-span-2 xl:col-span-3">
              <AuthAlert tone="error">Could not load senior records. Please try again.</AuthAlert>
            </div>
          )}
          {!loading && !loadError && flags.length === 0 && (
            <EmptyState
              icon={CheckCircle2}
              title="No new age threshold flags"
              description="Seniors who reach a benefit age will be flagged here."
              className="md:col-span-2 xl:col-span-3"
            />
          )}
        </div>
        <Pager
          page={currentFlagsPage}
          total={flags.length}
          perPage={FLAGS_PER_PAGE}
          onChange={setFlagsPage}
        />
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
            <div className="space-y-2">
              <RowSkeletons
                count={4}
                label="Loading senior records"
                className={`${tileClass} flex items-center gap-3 py-3`}
              />
            </div>
          ) : loadError ? (
            <AuthAlert tone="error">Could not load senior records. Please try again.</AuthAlert>
          ) : selectedSeniors.length === 0 ? (
            <EmptyState
              compact
              icon={Users}
              title="No seniors in this range"
              description="No senior records fall within this age range."
            />
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {selectedSeniors.length} {selectedSeniors.length === 1 ? "senior" : "seniors"}
              </p>
              <div className="max-h-[55dvh] space-y-2 overflow-y-auto">
                {visibleSeniors.map((senior) => (
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
              <Pager
                page={currentSeniorsPage}
                total={selectedSeniors.length}
                perPage={SENIORS_PER_PAGE}
                onChange={setSeniorsPage}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
