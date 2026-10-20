import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Loader2,
  MapPin,
  Search,
  X,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthAlert } from "@/components/AuthLayout";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState, SectionHeader, StatusPill, TileSkeletons } from "@/components/DesignKit";
import {
  fieldClass,
  panelClass,
  primaryButtonClass,
  secondaryButtonClass,
  tileClass,
} from "@/components/design-kit";
import { IconActionButton, IconSelect } from "@/components/IconActionButton";
import { PrivateFileLink, PrivateImage } from "@/components/PrivateFile";
import {
  getStoredUser,
  hasPermission,
  rejectSeniorRegistration,
  seniorFileUrl,
  type SeniorFileKind,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { useSeniors } from "@/lib/use-seniors";
import { BARANGAYS, benefitLabel, type Senior } from "@/lib/osca-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/eligibility")({
  head: () => ({ meta: [{ title: "Eligibility Review — Bulan SeniorCare" }] }),
  component: EligibilityReview,
});

function isImageDocument(path: string) {
  return /\.(jpe?g|png|webp)$/i.test(path);
}

function EligibilityReview() {
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [barangay, setBarangay] = useState("");
  const {
    seniors: pendingSeniors,
    matchingCount,
    lastPage,
    loading,
    error,
    reload,
    updateSenior,
  } = useSeniors({
    pendingOnly: true,
    page,
    perPage: 10,
    search,
    barangay,
  });
  const [viewing, setViewing] = useState<Senior | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkReviewing, setBulkReviewing] = useState(false);
  const [confirm, confirmDialog] = useConfirmDialog();
  // The Admin can take approving registrations away from the Head in Settings.
  const canReview = hasPermission("approve registrations");
  // Registrations being rejected; a reason is required and is shown to the leader.
  const [rejecting, setRejecting] = useState<Senior[] | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [rejectSaving, setRejectSaving] = useState(false);
  const selectedSeniors = pendingSeniors.filter((senior) => selectedIds.includes(senior.id));
  const allSelected = pendingSeniors.length > 0 && selectedSeniors.length === pendingSeniors.length;

  useEffect(() => {
    if (!(["admin", "head"] as string[]).includes(currentUser?.role ?? "")) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [currentUser?.role, navigate]);

  useEffect(() => {
    if (!loading && !error && pendingSeniors.length === 0 && page > 1) {
      setPage((current) => current - 1);
    }
  }, [error, loading, page, pendingSeniors.length]);

  if (!(["admin", "head"] as string[]).includes(currentUser?.role ?? "")) return null;

  async function approveSenior(senior: Senior) {
    try {
      await updateSenior(senior.id, { ...senior, status: "Active" });
      toast.success(`${senior.name}'s registration was approved.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update eligibility.");
    }
  }

  function startRejecting(seniors: Senior[]) {
    if (!seniors.length) return;
    setRejectReason("");
    setRejectError(null);
    setRejecting(seniors);
  }

  async function confirmReject() {
    if (!rejecting) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setRejectError("Reason is required.");
      return;
    }
    setRejectSaving(true);
    const results = await Promise.allSettled(
      rejecting.map((senior) => rejectSeniorRegistration(senior.id, reason)),
    );
    setRejectSaving(false);
    const failed = rejecting.filter((_, index) => results[index]?.status === "rejected");
    const firstFailure = results.find((result) => result.status === "rejected");
    setSelectedIds(failed.map((senior) => senior.id));
    reload();
    if (failed.length) {
      const reasonText =
        firstFailure?.status === "rejected" && firstFailure.reason instanceof Error
          ? firstFailure.reason.message
          : "Please try again.";
      setRejecting(failed);
      setRejectError(`${failed.length} could not be rejected. ${reasonText}`);
      return;
    }
    toast.success(
      rejecting.length === 1
        ? `${rejecting[0]!.name}'s registration was rejected.`
        : `${rejecting.length} registrations were rejected.`,
    );
    setRejecting(null);
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function toggleAllSelected() {
    setSelectedIds(allSelected ? [] : pendingSeniors.map((senior) => senior.id));
  }

  async function approveSelected() {
    const selected = selectedSeniors;
    if (!selected.length) return;
    const label = "eligible";
    const confirmed = await confirm({
      title: `Mark ${selected.length} as ${label}?`,
      description: `${selected.length} selected ${selected.length === 1 ? "registration" : "registrations"} will be approved.`,
      confirmLabel: `Mark ${label}`,
    });
    if (!confirmed) return;

    setBulkReviewing(true);
    const results = await Promise.allSettled(
      selected.map((senior) => updateSenior(senior.id, { ...senior, status: "Active" })),
    );
    setBulkReviewing(false);
    const failedIds = selected
      .filter((_, index) => results[index]?.status === "rejected")
      .map((senior) => senior.id);
    setSelectedIds(failedIds);
    const updatedCount = selected.length - failedIds.length;
    if (failedIds.length)
      toast.error(
        `${updatedCount} marked ${label}; ${failedIds.length} could not be updated. Please retry the rest.`,
      );
    else
      toast.success(
        `${updatedCount} ${updatedCount === 1 ? "registration" : "registrations"} marked ${label}.`,
      );
    // Bring the next registrations into the emptied page and refresh the waiting count.
    reload();
  }

  return (
    <AppShell
      title="Eligibility Review"
      subtitle="Verify age-threshold flags before enrollment"
      breadcrumb={["Dashboard", "Eligibility Review"]}
    >
      <section className={`${panelClass} p-5 sm:p-7`}>
        <SectionHeader
          icon={ClipboardCheck}
          title="Pending senior registrations"
          subtitle="Admin review is required before a one-time grant is recorded."
          badge={
            matchingCount > 0 ? (
              <StatusPill tone="gold">{matchingCount} waiting</StatusPill>
            ) : undefined
          }
        />
        <div className="mt-5 flex items-center gap-2 sm:gap-3">
          <label className="relative block min-w-0 flex-1">
            <span className="sr-only">Search pending registrations</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
                setSelectedIds([]);
              }}
              placeholder="Search name or OSCA ID"
              className={`${fieldClass} h-10 pl-10 sm:h-11`}
            />
          </label>
          <IconSelect
            label="Barangay"
            searchable
            icon={<MapPin className="h-4 w-4" />}
            value={barangay}
            defaultValue=""
            className="sm:w-60"
            options={[
              { value: "", label: "All barangays" },
              ...BARANGAYS.map((name) => ({ value: name, label: name })),
            ]}
            onChange={(value) => {
              setBarangay(value);
              setPage(1);
              setSelectedIds([]);
            }}
          />
          {(search || barangay) && (
            <IconActionButton
              label="Clear filters"
              variant="outline"
              icon={<X className="h-4 w-4" />}
              className="h-10 w-10 text-xs hover:translate-y-0 sm:h-11 sm:px-4"
              onClick={() => {
                setSearch("");
                setBarangay("");
                setPage(1);
                setSelectedIds([]);
              }}
            />
          )}
        </div>
        {canReview && pendingSeniors.length > 0 && (
          <div className={`${tileClass} mt-5 flex flex-wrap items-center gap-3 py-3`}>
            <label className="inline-flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAllSelected}
                disabled={bulkReviewing}
                className="h-4 w-4 accent-[var(--navy)]"
              />
              Select all on this page
            </label>
            <span className="text-xs text-muted-foreground">{selectedSeniors.length} selected</span>
            <div className="grid w-full grid-cols-2 gap-2 sm:ml-auto sm:flex sm:w-auto sm:flex-wrap">
              <button
                type="button"
                onClick={() => startRejecting(selectedSeniors)}
                disabled={bulkReviewing || selectedSeniors.length === 0}
                className={cn(
                  secondaryButtonClass,
                  "h-10 justify-center px-3 text-xs text-destructive sm:h-9 hover:border-destructive/40 hover:bg-destructive/10 disabled:opacity-40",
                )}
              >
                <X className="h-3.5 w-3.5" /> Reject
              </button>
              <button
                type="button"
                onClick={() => void approveSelected()}
                disabled={bulkReviewing || selectedSeniors.length === 0}
                className={cn(
                  primaryButtonClass,
                  "h-10 justify-center px-3 text-xs disabled:opacity-40 sm:h-9",
                )}
              >
                {bulkReviewing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                Eligible
              </button>
            </div>
          </div>
        )}
        <div className="mt-6 space-y-3">
          {loading && <TileSkeletons count={3} label="Loading pending registrations" />}
          {error && (
            <AuthAlert tone="error">
              Unable to load pending registrations. Please refresh and try again.
            </AuthAlert>
          )}
          {pendingSeniors.map((senior) => {
            return (
              <article
                key={senior.id}
                onClick={(event) => {
                  // Clicks on the checkbox or the review buttons keep their own behavior.
                  if ((event.target as HTMLElement).closest("button, input, label")) return;
                  setViewing(senior);
                }}
                className={`${tileClass} flex cursor-pointer flex-wrap items-center justify-between gap-4 transition-colors hover:border-navy/30`}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(senior.id)}
                    onChange={() => toggleSelected(senior.id)}
                    disabled={bulkReviewing}
                    aria-label={`Select ${senior.name}`}
                    className="mt-1 h-4 w-4 shrink-0 accent-[var(--navy)]"
                  />
                  <div className="min-w-0">
                    <p className="font-bold">
                      <button
                        type="button"
                        onClick={() => setViewing(senior)}
                        aria-label={`View full information for ${senior.name}`}
                        className="text-left hover:underline"
                      >
                        {senior.name}
                      </button>{" "}
                      <span className="ml-1 text-xs font-semibold text-muted-foreground">
                        {senior.id}
                      </span>
                    </p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-bold text-gold-foreground dark:text-gold">
                        Age {senior.age}
                      </span>
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" /> {senior.barangay}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Review this registration before it becomes an active record.
                    </p>
                  </div>
                </div>
                {canReview && (
                  <div className="flex w-full justify-end gap-2 sm:w-auto">
                    <button
                      onClick={() => startRejecting([senior])}
                      className={cn(
                        secondaryButtonClass,
                        "h-8 px-3 text-xs whitespace-nowrap text-destructive hover:border-destructive/40 hover:bg-destructive/10",
                      )}
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </button>
                    <button
                      onClick={() => void approveSenior(senior)}
                      className={cn(primaryButtonClass, "h-8 px-3 text-xs")}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Eligible
                    </button>
                  </div>
                )}
              </article>
            );
          })}
          {!loading && !error && pendingSeniors.length === 0 && (
            <EmptyState
              icon={search || barangay ? Search : CheckCircle2}
              title={search || barangay ? "No matches" : "All caught up"}
              description={
                search || barangay
                  ? "No pending registrations match these filters."
                  : "There are no pending registrations to review."
              }
            />
          )}
        </div>
        {matchingCount > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
            <span className="text-xs text-muted-foreground">
              Showing {(page - 1) * 10 + 1}-{Math.min(page * 10, matchingCount)} of {matchingCount}{" "}
              pending registrations
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setPage((current) => Math.max(1, current - 1));
                  setSelectedIds([]);
                }}
                disabled={page <= 1 || loading}
                aria-label="Previous page"
                className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-muted-foreground">
                Page <span className="font-semibold text-foreground">{page}</span> of{" "}
                <span className="font-semibold text-foreground">{lastPage}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setPage((current) => Math.min(lastPage, current + 1));
                  setSelectedIds([]);
                }}
                disabled={page >= lastPage || loading}
                aria-label="Next page"
                className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>
      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{viewing?.name}</DialogTitle>
            <DialogDescription>Full senior citizen information</DialogDescription>
          </DialogHeader>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Senior ID", viewing?.id],
              ["Name", viewing?.name],
              ["Age", viewing?.age],
              ["Barangay", viewing?.barangay],
              ["Contact", viewing?.contact],
              ["Benefits", viewing && benefitLabel(viewing.benefit)],
              ["Status", viewing?.status],
            ].map(([label, value]) => (
              <div key={String(label)} className={`${tileClass} p-3`}>
                <dt className="text-[0.6875rem] font-semibold tracking-wider text-muted-foreground uppercase">
                  {label}
                </dt>
                <dd className="mt-1 font-semibold">{value || "Not provided"}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-2 border-t border-border/60 pt-5">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Supporting documents
            </p>
            <div className="mt-3 grid grid-cols-2 gap-4">
              {(
                [
                  ["Valid ID", "valid_id", viewing?.validIdPath ?? viewing?.idDocumentPath],
                  ["Birth Certificate", "birth_certificate", viewing?.birthCertificatePath],
                ] as [string, SeniorFileKind, string | null | undefined][]
              ).map(([label, kind, path]) => (
                <div key={label} className="min-w-0">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  {path && viewing ? (
                    <PrivateFileLink
                      path={seniorFileUrl(viewing.id, kind, path)}
                      className="mt-2 block text-sm font-semibold"
                    >
                      {isImageDocument(path) ? (
                        <PrivateImage
                          path={seniorFileUrl(viewing.id, kind, path)}
                          alt={label}
                          className="h-24 w-full rounded-lg border border-border/60 object-cover"
                        />
                      ) : (
                        <span className={`${tileClass} block py-4 text-center text-primary`}>
                          Open document
                        </span>
                      )}
                    </PrivateFileLink>
                  ) : (
                    <span className="mt-2 block rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                      Not uploaded
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!rejecting}
        onOpenChange={(open) => !open && !rejectSaving && setRejecting(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {rejecting?.length === 1
                ? `Reject ${rejecting[0]!.name}'s registration?`
                : `Reject ${rejecting?.length ?? 0} registrations?`}
            </DialogTitle>
            <DialogDescription>
              The barangay leader will see this reason on the senior's record.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label htmlFor="reject-reason" className="mb-1.5 block text-sm font-semibold">
              Reason *
            </label>
            <textarea
              id="reject-reason"
              rows={3}
              maxLength={500}
              autoFocus
              value={rejectReason}
              onChange={(event) => {
                setRejectReason(event.target.value);
                if (event.target.value.trim()) setRejectError(null);
              }}
              placeholder="e.g. Incomplete documents"
              aria-invalid={!!rejectError}
              aria-describedby={rejectError ? "reject-reason-error" : undefined}
              className={cn(fieldClass, "py-2.5", rejectError && "border-destructive")}
            />
            {rejectError && (
              <p id="reject-reason-error" role="alert" className="mt-1.5 text-sm text-destructive">
                {rejectError}
              </p>
            )}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setRejecting(null)}
              disabled={rejectSaving}
              className={secondaryButtonClass}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void confirmReject()}
              disabled={rejectSaving}
              className={cn(primaryButtonClass, "bg-destructive hover:bg-destructive/90")}
            >
              {rejectSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Reject registration
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </AppShell>
  );
}
