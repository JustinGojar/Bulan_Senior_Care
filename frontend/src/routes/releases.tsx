import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Grid2X2,
  History,
  Loader2,
  Paperclip,
  RotateCcw,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthAlert } from "@/components/AuthLayout";
import { EmptyState, SectionHeader, StatusPill, TileSkeletons } from "@/components/DesignKit";
import { IconActionButton, IconSelect } from "@/components/IconActionButton";
import { ReleaseRosterDialog } from "@/components/ReleaseRosterDialog";
import {
  badgeClass,
  fieldClass,
  panelClass,
  secondaryButtonClass,
  tileClass,
} from "@/components/design-kit";
import { apiFetch, getBenefitReleases, type BenefitRelease } from "@/lib/api";

export const Route = createFileRoute("/releases")({
  head: () => ({ meta: [{ title: "Release History — Bulan SeniorCare" }] }),
  component: ReleaseHistoryPage,
});

const STATUS = {
  scheduled: { label: "Scheduled", tone: "gold" },
  released: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
} as const;

function longDate(date: string) {
  return new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString("en-PH", {
    dateStyle: "long",
  });
}

function ReleaseHistoryPage() {
  const [releases, setReleases] = useState<BenefitRelease[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [programs, setPrograms] = useState<Array<{ id: number; benefit_name: string }>>([]);
  const [benefitId, setBenefitId] = useState("All");
  const [releaseDate, setReleaseDate] = useState("");
  const filtered = benefitId !== "All" || releaseDate !== "";

  useEffect(() => {
    apiFetch<Array<{ id: number; benefit_name: string }>>("/benefits")
      .then(setPrograms)
      .catch(() => setPrograms([]));
  }, []);

  // Any filter change starts again from the first page.
  useEffect(() => {
    setPage(1);
  }, [benefitId, releaseDate]);

  const load = useCallback(() => {
    setLoading(true);
    return getBenefitReleases(page, {
      benefitId: benefitId === "All" ? "" : benefitId,
      // One day: batches released on exactly that date.
      dateFrom: releaseDate,
      dateTo: releaseDate,
    })
      .then((result) => {
        setReleases(result.data);
        setLastPage(result.last_page);
        setError(null);
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [page, benefitId, releaseDate]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppShell
      title="Release History"
      subtitle="Every release batch, its seniors and its documents"
      breadcrumb={["Dashboard", "Benefit Tracking", "Release History"]}
    >
      <section className={`${panelClass} p-4 sm:p-7`}>
        <SectionHeader
          icon={History}
          title="Release batches"
          subtitle="Newest release date first. Open a batch to see who received and its documents."
          badge={
            <span className={`${badgeClass} inline-flex items-center gap-1.5`}>
              {loading && <Loader2 className="h-3 w-3 animate-spin" />}
              {loading ? "Loading..." : `${releases.length} on this page`}
            </span>
          }
        />

        <div className="mt-5 flex flex-wrap items-end gap-2">
          <IconSelect
            label="Program"
            className="w-full sm:w-56"
            icon={<Grid2X2 className="h-4 w-4" />}
            value={benefitId}
            options={[
              { value: "All", label: "All Programs" },
              ...programs.map((program) => ({
                value: String(program.id),
                label: program.benefit_name,
              })),
            ]}
            onChange={setBenefitId}
          />
          <input
            type="date"
            value={releaseDate}
            onChange={(event) => setReleaseDate(event.target.value)}
            aria-label="Release date"
            title="Release date"
            className={`${fieldClass} h-10 flex-1 sm:w-44 sm:flex-none`}
          />
          {filtered && (
            <IconActionButton
              label="Clear filters"
              variant="outline"
              icon={<RotateCcw className="h-4 w-4" />}
              className="h-10 w-10 text-xs hover:translate-y-0 sm:h-10 sm:px-4"
              onClick={() => {
                setBenefitId("All");
                setReleaseDate("");
              }}
            />
          )}
        </div>

        {error && (
          <div className="mt-6">
            <AuthAlert tone="error">{error}</AuthAlert>
          </div>
        )}
        {!loading && !error && releases.length === 0 && (
          <EmptyState
            icon={History}
            title={filtered ? "No batches match" : "No release batches yet"}
            description={
              filtered
                ? "Try another program or date range."
                : "Batches saved from Benefit Tracking appear here."
            }
            className="mt-6"
          />
        )}

        <div className="mt-5 space-y-3">
          {loading && releases.length === 0 && (
            <TileSkeletons count={4} label="Loading release batches" />
          )}
          {releases.map((release) => {
            const status = STATUS[release.status];
            const barangays = release.barangays?.length
              ? release.barangays.map((barangay) => barangay.barangay_name).join(", ")
              : "All barangays";
            return (
              <button
                key={release.id}
                type="button"
                onClick={() => setOpenId(release.id)}
                className={`${tileClass} block w-full text-left transition-colors hover:bg-muted/60`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold">
                      {release.benefit.benefit_name}{" "}
                      <span className="font-semibold text-muted-foreground">
                        · {release.period_label}
                      </span>
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      {longDate(release.release_date)}
                    </p>
                  </div>
                  <StatusPill tone={status.tone}>{status.label}</StatusPill>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{barangays}</p>
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold">
                  <span>
                    {release.received_count ?? 0} of {release.transactions_count ?? 0} received
                  </span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Paperclip className="h-3.5 w-3.5" />
                    {release.documents_count ?? 0}{" "}
                    {release.documents_count === 1 ? "document" : "documents"}
                  </span>
                </p>
              </button>
            );
          })}
        </div>

        {lastPage > 1 && (
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1 || loading}
              aria-label="Previous page"
              className={`${secondaryButtonClass} h-10 px-3 sm:px-4`}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>
            <span className="text-sm text-muted-foreground">
              Page <span className="font-semibold text-foreground">{page}</span> of{" "}
              <span className="font-semibold text-foreground">{lastPage}</span>
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
              disabled={page === lastPage || loading}
              aria-label="Next page"
              className={`${secondaryButtonClass} h-10 px-3 sm:px-4`}
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>

      <ReleaseRosterDialog
        releaseId={openId}
        onClose={() => setOpenId(null)}
        onChanged={() => void load()}
      />
    </AppShell>
  );
}
