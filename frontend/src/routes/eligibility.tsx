import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileWarning,
  ListFilter,
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
import { getStoredUser, seniorFileUrl, type SeniorFileKind } from "@/lib/api";
import { cn } from "@/lib/utils";
import { flagSeniorForReview, useSeniors } from "@/lib/use-seniors";
import { Textarea } from "@/components/ui/textarea";
import { DocumentReviewNotice } from "@/components/DocumentReviewNotice";
import { BARANGAYS, benefitLabel, type Senior } from "@/lib/osca-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/eligibility")({
  head: () => ({ meta: [{ title: "Eligibility Review — Bulan SeniorCare" }] }),
  component: EligibilityReview,
});

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** An inactive record needs a reason, so a rejection is saved as "not_eligible". */
function reviewedDraft(senior: Senior, status: "Active" | "Inactive"): Senior {
  if (status === "Active") return { ...senior, status };
  return { ...senior, status, inactiveReason: "not_eligible", inactiveRemarks: "" };
}

/** A pending registration not waiting for corrected documents, so it can be decided now. */
function isDecidable(senior: Senior) {
  return senior.status === "Pending" && !senior.reviewNote;
}

const REVIEW_FILTERS = [
  { value: "", label: "All pending" },
  { value: "awaiting", label: "Awaiting review" },
  { value: "in_review", label: "In review" },
  { value: "not_eligible", label: "Not eligible" },
];

function isImageDocument(path: string) {
  return /\.(jpe?g|png|webp)$/i.test(path);
}

function EligibilityReview() {
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [barangay, setBarangay] = useState("");
  const [reviewFilter, setReviewFilter] = useState("");
  const {
    seniors: pendingSeniors,
    matchingCount,
    lastPage,
    loading,
    error,
    reload,
    updateSenior,
  } = useSeniors({
    // Not eligible registrations are inactive; every other filter shows pending ones.
    pendingOnly: reviewFilter !== "not_eligible",
    review: reviewFilter,
    sort: "latest",
    page,
    perPage: 10,
    search,
    barangay,
  });
  const [viewing, setViewing] = useState<Senior | null>(null);
  const [reviewNoteOpen, setReviewNoteOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [savingReview, setSavingReview] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkReviewing, setBulkReviewing] = useState(false);
  const [confirm, confirmDialog] = useConfirmDialog();
  // Registrations in review wait for corrected documents, so they cannot be decided in bulk.
  const reviewableSeniors = pendingSeniors.filter(isDecidable);
  const selectedSeniors = reviewableSeniors.filter((senior) => selectedIds.includes(senior.id));
  const allSelected =
    reviewableSeniors.length > 0 && selectedSeniors.length === reviewableSeniors.length;

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

  async function reviewSenior(senior: Senior, status: "Active" | "Inactive") {
    try {
      await updateSenior(senior.id, reviewedDraft(senior, status));
      toast.success(`${senior.name} marked ${status === "Active" ? "eligible" : "not eligible"}.`);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update eligibility.");
      return false;
    }
  }

  async function reviewViewing(status: "Active" | "Inactive") {
    if (!viewing) return;
    if (await reviewSenior(viewing, status)) setViewing(null);
  }

  async function submitReviewNote() {
    if (!viewing || !reviewNote.trim()) return;
    setSavingReview(true);
    try {
      const updated = await flagSeniorForReview(viewing.id, reviewNote.trim());
      toast.success(`${viewing.name} is in review. The barangay leader was notified.`);
      setViewing(updated);
      setReviewNoteOpen(false);
      reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not put this registration in review.",
      );
    } finally {
      setSavingReview(false);
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function toggleAllSelected() {
    setSelectedIds(allSelected ? [] : reviewableSeniors.map((senior) => senior.id));
  }

  async function reviewSelected(status: "Active" | "Inactive") {
    const selected = selectedSeniors;
    if (!selected.length) return;
    const label = status === "Active" ? "eligible" : "not eligible";
    const confirmed = await confirm({
      title: `Mark ${selected.length} as ${label}?`,
      description: `${selected.length} selected ${selected.length === 1 ? "registration" : "registrations"} will be marked ${label}.`,
      confirmLabel: `Mark ${label}`,
      destructive: status === "Inactive",
    });
    if (!confirmed) return;

    setBulkReviewing(true);
    const results = await Promise.allSettled(
      selected.map((senior) => updateSenior(senior.id, reviewedDraft(senior, status))),
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
              <StatusPill tone={reviewFilter === "not_eligible" ? "danger" : "gold"}>
                {matchingCount}{" "}
                {reviewFilter === "not_eligible"
                  ? "not eligible"
                  : reviewFilter === "in_review"
                    ? "in review"
                    : "waiting"}
              </StatusPill>
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
          <IconSelect
            label="Review status"
            icon={<ListFilter className="h-4 w-4" />}
            value={reviewFilter}
            defaultValue=""
            className="sm:w-52"
            dotClassName={reviewFilter === "not_eligible" ? "bg-destructive" : "bg-gold"}
            options={REVIEW_FILTERS}
            onChange={(value) => {
              setReviewFilter(value);
              setPage(1);
              setSelectedIds([]);
            }}
          />
          {(search || barangay || reviewFilter) && (
            <IconActionButton
              label="Clear filters"
              variant="outline"
              icon={<X className="h-4 w-4" />}
              className="h-10 w-10 text-xs hover:translate-y-0 sm:h-11 sm:px-4"
              onClick={() => {
                setSearch("");
                setBarangay("");
                setReviewFilter("");
                setPage(1);
                setSelectedIds([]);
              }}
            />
          )}
        </div>
        {pendingSeniors.length > 0 && (
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
            {(selectedSeniors.length > 0 || bulkReviewing) && (
              <div className="grid w-full grid-cols-2 gap-2 sm:ml-auto sm:flex sm:w-auto sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => reviewSelected("Inactive")}
                  disabled={bulkReviewing || selectedSeniors.length === 0}
                  className={cn(
                    secondaryButtonClass,
                    "h-10 justify-center px-3 text-xs text-destructive sm:h-9 hover:border-destructive/40 hover:bg-destructive/10 disabled:opacity-40",
                  )}
                >
                  <X className="h-3.5 w-3.5" /> Not eligible
                </button>
                <button
                  type="button"
                  onClick={() => reviewSelected("Active")}
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
            )}
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
                    disabled={bulkReviewing || !isDecidable(senior)}
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
                      {senior.status === "Inactive" ? (
                        <StatusPill tone="danger">Not eligible</StatusPill>
                      ) : (
                        senior.reviewNote && <StatusPill tone="gold">In review</StatusPill>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {senior.status === "Inactive"
                        ? "This registration was marked not eligible."
                        : senior.reviewNote
                          ? `Waiting for corrected documents: ${senior.reviewNote}`
                          : "Review this registration before it becomes an active record."}
                    </p>
                  </div>
                </div>
                {isDecidable(senior) && (
                  <div className="flex w-full justify-end gap-2 sm:w-auto">
                    <button
                      onClick={() => reviewSenior(senior, "Inactive")}
                      className={cn(
                        secondaryButtonClass,
                        "h-8 px-3 text-xs whitespace-nowrap text-destructive hover:border-destructive/40 hover:bg-destructive/10",
                      )}
                    >
                      <X className="h-3.5 w-3.5" />
                      Not eligible
                    </button>
                    <button
                      onClick={() => reviewSenior(senior, "Active")}
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
              icon={search || barangay || reviewFilter ? Search : CheckCircle2}
              title={search || barangay || reviewFilter ? "No matches" : "All caught up"}
              description={
                search || barangay || reviewFilter
                  ? "No registrations match these filters."
                  : "There are no pending registrations to review."
              }
            />
          )}
        </div>
        {matchingCount > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
            <span className="text-xs text-muted-foreground">
              Showing {(page - 1) * 10 + 1}-{Math.min(page * 10, matchingCount)} of {matchingCount}{" "}
              {reviewFilter === "not_eligible" ? "registrations" : "pending registrations"}
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
            <div className="flex items-center gap-4">
              <span className="bg-navy grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full text-sm font-bold text-white ring-2 ring-gold/50">
                <PrivateImage
                  path={
                    viewing?.photoPath
                      ? seniorFileUrl(viewing.id, "photo", viewing.photoPath)
                      : null
                  }
                  alt={viewing?.name ?? ""}
                  className="h-full w-full object-cover"
                  fallback={initials(viewing?.name ?? "")}
                />
              </span>
              <div className="min-w-0 text-left">
                <DialogTitle className="font-display truncate">{viewing?.name}</DialogTitle>
                <DialogDescription className="mt-1">
                  Full senior citizen information
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          {viewing?.reviewNote && (
            <DocumentReviewNotice senior={viewing} canResubmit={false} onResubmitted={setViewing} />
          )}
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
          {/* Only pending registrations are decided here; not eligible ones are view-only. */}
          {viewing?.status === "Pending" && (
            <div className="mt-2 flex flex-wrap justify-end gap-2 border-t border-border/60 pt-5">
              <button
                onClick={() => {
                  setReviewNote(viewing?.reviewNote ?? "");
                  setReviewNoteOpen(true);
                }}
                className={cn(secondaryButtonClass, "h-9 px-4 text-sm whitespace-nowrap")}
              >
                <FileWarning className="h-4 w-4" />
                {viewing?.reviewNote ? "Edit review note" : "In review"}
              </button>
              {/* A registration in review waits for the leader's corrected documents first. */}
              {!viewing?.reviewNote && (
                <>
                  <button
                    onClick={() => reviewViewing("Inactive")}
                    className={cn(
                      secondaryButtonClass,
                      "h-9 px-4 text-sm whitespace-nowrap text-destructive hover:border-destructive/40 hover:bg-destructive/10",
                    )}
                  >
                    <X className="h-4 w-4" />
                    Not eligible
                  </button>
                  <button
                    onClick={() => reviewViewing("Active")}
                    className={cn(primaryButtonClass, "h-9 px-4 text-sm")}
                  >
                    <Check className="h-4 w-4" />
                    Eligible
                  </button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={reviewNoteOpen}
        onOpenChange={(open) => !savingReview && setReviewNoteOpen(open)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Put in review</DialogTitle>
            <DialogDescription>
              Tell the barangay leader what is wrong with the documents of {viewing?.name}. They
              will be notified and can upload corrected documents.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitReviewNote();
            }}
            className="space-y-4"
          >
            <Textarea
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
              maxLength={500}
              rows={4}
              autoFocus
              aria-label="What is wrong with the documents"
              placeholder="e.g. The valid ID is blurry and the birth certificate belongs to someone else."
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReviewNoteOpen(false)}
                disabled={savingReview}
                className={cn(secondaryButtonClass, "h-9 px-4 text-sm")}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingReview || !reviewNote.trim()}
                className={cn(primaryButtonClass, "h-9 px-4 text-sm")}
              >
                {savingReview ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileWarning className="h-4 w-4" />
                )}
                Put in review
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </AppShell>
  );
}
