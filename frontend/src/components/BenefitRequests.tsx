import { Check, ClipboardList, HandCoins, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState, SectionHeader, StatusPill, TileSkeletons } from "@/components/DesignKit";
import {
  fieldClass,
  panelClass,
  primaryButtonClass,
  secondaryButtonClass,
  tileClass,
} from "@/components/design-kit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  apiFetch,
  createBenefitRequest,
  getBenefitRequests,
  hasPermission,
  reviewBenefitRequest,
  type BenefitRequest,
  type BenefitRequestStatus,
} from "@/lib/api";
import { formatPesoAmount } from "@/lib/peso";
import { cn } from "@/lib/utils";

const STATUS: Record<
  BenefitRequestStatus,
  { label: string; tone: "gold" | "success" | "danger" | "neutral" }
> = {
  for_verification: { label: "For Verification", tone: "gold" },
  approved: { label: "Approved for Release", tone: "neutral" },
  rejected: { label: "Rejected", tone: "danger" },
  released: { label: "Released", tone: "success" },
};

type ActiveBenefit = {
  id: number;
  benefit_name: string;
  min_age: number;
  max_age?: number | null;
  amount?: string | null;
};

function seniorName(request: BenefitRequest) {
  return [request.senior.first_name, request.senior.middle_name, request.senior.last_name]
    .filter(Boolean)
    .join(" ");
}

function formatDate(value?: string | null) {
  return value
    ? new Date(value.length === 10 ? `${value}T00:00:00` : value).toLocaleDateString()
    : "";
}

function localToday() {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
}

/** A barangay leader asks for a benefit on behalf of one approved senior. */
export function RequestBenefitDialog({
  senior,
  onOpenChange,
}: {
  senior: { id: string; name: string; age: number } | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [benefits, setBenefits] = useState<ActiveBenefit[]>([]);
  const [benefitId, setBenefitId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!senior) return;
    setBenefitId("");
    setRemarks("");
    setError(null);
    apiFetch<ActiveBenefit[]>("/benefits")
      .then(setBenefits)
      .catch(() => setBenefits([]));
  }, [senior]);

  // Only the programs this senior's age qualifies for.
  const eligible = benefits.filter(
    (benefit) =>
      senior &&
      senior.age >= benefit.min_age &&
      (!benefit.max_age || senior.age <= benefit.max_age),
  );

  async function submit() {
    if (!senior) return;
    if (!benefitId) {
      setError("Select a benefit type.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createBenefitRequest(senior.id, Number(benefitId), remarks);
      toast.success(`Benefit request for ${senior.name} sent to the Head for verification.`);
      onOpenChange(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to submit the request.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!senior} onOpenChange={(open) => !saving && onOpenChange(open)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Request benefit</DialogTitle>
          <DialogDescription>
            For {senior?.name}. The Head verifies the request before the benefit is released.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label htmlFor="request-benefit-type" className="mb-1.5 block text-sm font-semibold">
              Benefit type *
            </label>
            <select
              id="request-benefit-type"
              value={benefitId}
              onChange={(event) => {
                setBenefitId(event.target.value);
                setError(null);
              }}
              className={`${fieldClass} h-11`}
            >
              <option value="">Select a benefit</option>
              {eligible.map((benefit) => (
                <option key={benefit.id} value={benefit.id}>
                  {benefit.benefit_name}
                  {benefit.amount ? ` — ${formatPesoAmount(Number(benefit.amount))}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="request-benefit-remarks" className="mb-1.5 block text-sm font-semibold">
              Remarks
            </label>
            <textarea
              id="request-benefit-remarks"
              rows={3}
              maxLength={500}
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder="Optional notes for the Head"
              className={`${fieldClass} py-2.5`}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm font-semibold text-destructive">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className={secondaryButtonClass}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className={primaryButtonClass}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit request
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Review = { request: BenefitRequest; action: "reject" | "release" };

/**
 * Benefit requests from barangay leaders. Leaders follow their barangay's requests; the Head
 * verifies them, rejects them with a reason, and records each release.
 */
export function BenefitRequestsPanel({ role }: { role?: string | undefined }) {
  const isHead = role === "head";
  const canReview = isHead && hasPermission("manage benefit requests");
  const [filter, setFilter] = useState<BenefitRequestStatus | "">(isHead ? "for_verification" : "");
  const [page, setPage] = useState(1);
  const [requests, setRequests] = useState<BenefitRequest[]>([]);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [reason, setReason] = useState("");
  const [releaseDate, setReleaseDate] = useState(localToday());
  const [periodLabel, setPeriodLabel] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getBenefitRequests({ ...(filter && { status: filter }), page })
      .then((result) => {
        setRequests(result.data);
        setLastPage(result.last_page);
      })
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, [filter, page]);

  useEffect(load, [load]);

  async function verify(request: BenefitRequest) {
    setBusyId(request.id);
    try {
      await reviewBenefitRequest(request.id, { action: "verify" });
      toast.success(
        `${request.benefit.benefit_name} for ${seniorName(request)} approved for release.`,
      );
      load();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to verify the request.");
    } finally {
      setBusyId(null);
    }
  }

  function openReview(request: BenefitRequest, action: Review["action"]) {
    setReason("");
    setReleaseDate(localToday());
    setPeriodLabel("");
    setReviewError(null);
    setReview({ request, action });
  }

  async function submitReview() {
    if (!review) return;
    const { request, action } = review;
    if (action === "reject" && !reason.trim()) {
      setReviewError("Reason is required.");
      return;
    }
    if (action === "release" && !releaseDate) {
      setReviewError("Enter the release date.");
      return;
    }
    setBusyId(request.id);
    setReviewError(null);
    try {
      await reviewBenefitRequest(
        request.id,
        action === "reject"
          ? { action, reason: reason.trim() }
          : {
              action,
              release_date: releaseDate,
              ...(periodLabel.trim() ? { period_label: periodLabel.trim() } : {}),
            },
      );
      toast.success(
        action === "reject"
          ? "Benefit request rejected."
          : `${request.benefit.benefit_name} released to ${seniorName(request)}.`,
      );
      setReview(null);
      load();
    } catch (reason) {
      setReviewError(reason instanceof Error ? reason.message : "Unable to save.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section id="benefit-requests" className={`${panelClass} mt-6 p-5 sm:p-7`}>
      <SectionHeader
        icon={ClipboardList}
        title="Benefit requests"
        subtitle={
          isHead
            ? "Verify leaders' requests, then record each release."
            : "Requests you submitted for your barangay's seniors and where they stand."
        }
        badge={
          <select
            aria-label="Filter benefit requests by status"
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value as BenefitRequestStatus | "");
              setPage(1);
            }}
            className={cn(fieldClass, "h-10 w-full sm:w-56")}
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        }
      />
      <div className="mt-5 space-y-3">
        {loading && <TileSkeletons count={2} label="Loading benefit requests" />}
        {!loading && requests.length === 0 && (
          <EmptyState
            compact
            icon={HandCoins}
            title="No benefit requests"
            description={
              isHead
                ? "Requests submitted by barangay leaders will appear here."
                : "Open an approved senior's record and choose Request benefit."
            }
          />
        )}
        {!loading &&
          requests.map((request) => (
            <article
              key={request.id}
              className={`${tileClass} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{seniorName(request)}</p>
                  <StatusPill tone={STATUS[request.status].tone}>
                    {STATUS[request.status].label}
                  </StatusPill>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {request.benefit.benefit_name} · {request.senior.osca_id_number} ·{" "}
                  {request.senior.barangay?.barangay_name ?? "No barangay"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Requested {formatDate(request.created_at)}
                  {request.requester && ` by ${request.requester.name}`}
                  {request.status === "approved" &&
                    request.verifier &&
                    ` · Verified by ${request.verifier.name}`}
                  {request.status === "released" &&
                    ` · Released ${formatDate(request.release_date)}${request.releaser ? ` by ${request.releaser.name}` : ""}${request.period_label ? ` (${request.period_label})` : ""}`}
                </p>
                {request.remarks && (
                  <p className="mt-1 text-xs text-muted-foreground">Remarks: {request.remarks}</p>
                )}
                {request.status === "rejected" && request.rejection_reason && (
                  <p className="mt-1 text-sm font-semibold text-destructive">
                    Reason: {request.rejection_reason}
                  </p>
                )}
              </div>
              {canReview &&
                (request.status === "for_verification" || request.status === "approved") && (
                  <div className="flex shrink-0 justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openReview(request, "reject")}
                      disabled={busyId === request.id}
                      className={cn(
                        secondaryButtonClass,
                        "h-9 px-3 text-xs text-destructive hover:border-destructive/40 hover:bg-destructive/10",
                      )}
                    >
                      <X className="h-3.5 w-3.5" /> Reject
                    </button>
                    {request.status === "for_verification" ? (
                      <button
                        type="button"
                        onClick={() => void verify(request)}
                        disabled={busyId === request.id}
                        className={cn(primaryButtonClass, "h-9 px-3 text-xs")}
                      >
                        {busyId === request.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        Verify / Approve
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openReview(request, "release")}
                        disabled={busyId === request.id}
                        className={cn(primaryButtonClass, "h-9 px-3 text-xs")}
                      >
                        <HandCoins className="h-3.5 w-3.5" /> Mark as Released
                      </button>
                    )}
                  </div>
                )}
            </article>
          ))}
      </div>
      {lastPage > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1}
            className={cn(secondaryButtonClass, "h-9 px-3")}
          >
            Previous
          </button>
          <span className="text-muted-foreground">
            Page {page} of {lastPage}
          </span>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
            disabled={page >= lastPage}
            className={cn(secondaryButtonClass, "h-9 px-3")}
          >
            Next
          </button>
        </div>
      )}

      <Dialog open={!!review} onOpenChange={(open) => !open && busyId === null && setReview(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {review?.action === "reject" ? "Reject benefit request?" : "Mark as released"}
            </DialogTitle>
            <DialogDescription>
              {review &&
                `${review.request.benefit.benefit_name} for ${seniorName(review.request)}.`}
              {review?.action === "release" &&
                " The release date and your name are recorded on the senior's benefit record."}
            </DialogDescription>
          </DialogHeader>
          {review?.action === "reject" ? (
            <div>
              <label
                htmlFor="benefit-request-reason"
                className="mb-1.5 block text-sm font-semibold"
              >
                Reason *
              </label>
              <textarea
                id="benefit-request-reason"
                rows={3}
                maxLength={500}
                autoFocus
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className={`${fieldClass} py-2.5`}
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="benefit-release-date"
                  className="mb-1.5 block text-sm font-semibold"
                >
                  Release date *
                </label>
                <input
                  id="benefit-release-date"
                  type="date"
                  max={localToday()}
                  value={releaseDate}
                  onChange={(event) => setReleaseDate(event.target.value)}
                  className={`${fieldClass} h-11`}
                />
              </div>
              <div>
                <label
                  htmlFor="benefit-release-period"
                  className="mb-1.5 block text-sm font-semibold"
                >
                  Period
                </label>
                <input
                  id="benefit-release-period"
                  maxLength={100}
                  value={periodLabel}
                  onChange={(event) => setPeriodLabel(event.target.value)}
                  placeholder="Month of release"
                  className={`${fieldClass} h-11`}
                />
              </div>
            </div>
          )}
          {reviewError && (
            <p role="alert" className="text-sm font-semibold text-destructive">
              {reviewError}
            </p>
          )}
          <DialogFooter>
            <button
              type="button"
              onClick={() => setReview(null)}
              disabled={busyId !== null}
              className={secondaryButtonClass}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void submitReview()}
              disabled={busyId !== null}
              className={cn(
                primaryButtonClass,
                review?.action === "reject" && "bg-destructive hover:bg-destructive/90",
              )}
            >
              {busyId !== null && <Loader2 className="h-4 w-4 animate-spin" />}
              {review?.action === "reject" ? "Reject request" : "Record release"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
