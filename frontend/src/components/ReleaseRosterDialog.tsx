import { CheckCircle2, Download, FileText, Loader2, Paperclip, Trash2, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState, StatusPill } from "@/components/DesignKit";
import { PrivateFileLink } from "@/components/PrivateFile";
import { primaryButtonClass, secondaryButtonClass, tileClass } from "@/components/design-kit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  completeBenefitRelease,
  deleteReleaseDocument,
  getBenefitRelease,
  getStoredUser,
  releaseDocumentUrl,
  uploadReleaseDocuments,
  type ReleaseRoster,
} from "@/lib/api";

function longDate(date: string) {
  return new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString("en-PH", {
    dateStyle: "long",
  });
}

function localToday() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function peso(value: number) {
  return `₱${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fileSize(bytes?: number | null) {
  if (!bytes) return "";
  return bytes >= 1_048_576
    ? `${(bytes / 1_048_576).toFixed(1)} MB`
    : `${Math.ceil(bytes / 1024)} KB`;
}

type RosterItem = ReleaseRoster["transactions"][number];

function seniorName(item: RosterItem) {
  const senior = item.senior;
  if (!senior) return "Deleted record";
  return [`${senior.last_name},`, senior.first_name, senior.middle_name].filter(Boolean).join(" ");
}

const BATCH_STATUS = {
  scheduled: { label: "Scheduled", tone: "gold" },
  released: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
} as const;

/** A release batch: the seniors receiving on its date, its documents, and closing it afterwards. */
export function ReleaseRosterDialog({
  releaseId,
  onClose,
  onChanged,
}: {
  releaseId: number | null;
  onClose: () => void;
  /** Called after the batch is completed or its documents change, so lists can refresh. */
  onChanged?: () => void;
}) {
  const user = getStoredUser();
  const canComplete = user?.role === "admin" || user?.role === "head";
  const canUpload = user?.role === "admin" || user?.role === "leader";
  const [confirm, confirmDialog] = useConfirmDialog();
  const [roster, setRoster] = useState<ReleaseRoster | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"upload" | "complete" | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (releaseId === null) return;
    setRoster(null);
    setError(null);
    getBenefitRelease(releaseId)
      .then(setRoster)
      .catch((reason: Error) => setError(reason.message));
  }, [releaseId]);

  const items = roster?.transactions ?? [];
  const total = items.reduce((sum, item) => sum + Number(item.amount), 0);
  const received = items.filter((item) => item.status === "released").length;
  const pending = items.filter((item) => item.status === "pending").length;
  const barangayNames = roster?.barangays?.length
    ? roster.barangays.map((barangay) => barangay.barangay_name).join(", ")
    : "All barangays";

  function updated(next: ReleaseRoster) {
    setRoster(next);
    onChanged?.();
  }

  async function exportRoster() {
    if (!roster) return;
    try {
      const XLSX = await import("xlsx");
      const sheet = XLSX.utils.json_to_sheet(
        items.map((item, index) => ({
          "No.": index + 1,
          "OSCA ID": item.senior?.osca_id_number ?? "",
          "Last Name": item.senior?.last_name ?? "",
          "First Name": item.senior?.first_name ?? "",
          "Middle Name": item.senior?.middle_name ?? "",
          Barangay: item.senior?.barangay?.barangay_name ?? "",
          Amount: Number(item.amount),
          Signature: "",
        })),
      );
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, sheet, "Release batch");
      XLSX.writeFile(
        workbook,
        `${roster.benefit.benefit_name}-${roster.release_date.slice(0, 10)}.xlsx`.replace(
          /\s+/g,
          "-",
        ),
      );
    } catch {
      toast.error("Unable to export the release batch.");
    }
  }

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!roster || files.length === 0) return;
    setBusy("upload");
    try {
      updated(await uploadReleaseDocuments(roster.id, files));
      toast.success(`${files.length} ${files.length === 1 ? "document" : "documents"} uploaded.`);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to upload documents.");
    } finally {
      setBusy(null);
    }
  }

  async function removeDocument(documentId: number, name: string) {
    if (!roster) return;
    const ok = await confirm({
      title: "Remove this document?",
      description: `${name} will be removed from this release batch.`,
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!ok) return;
    try {
      updated(await deleteReleaseDocument(roster.id, documentId));
      toast.success("Document removed.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to remove the document.");
    }
  }

  async function completeBatch() {
    if (!roster) return;
    const ok = await confirm({
      title: "Mark this batch as completed?",
      description:
        pending > 0
          ? `${pending} ${pending === 1 ? "senior has" : "seniors have"} not been marked received and will be recorded as Not received (did not claim on the release day). They are listed again in the next batch.`
          : "Every senior in this batch has a result. The batch will be closed.",
      confirmLabel: "Complete batch",
    });
    if (!ok) return;
    setBusy("complete");
    try {
      updated(await completeBenefitRelease(roster.id));
      toast.success("Release batch completed.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to complete the batch.");
    } finally {
      setBusy(null);
    }
  }

  const status = roster ? BATCH_STATUS[roster.status] : null;
  const releaseDayReached = roster ? roster.release_date.slice(0, 10) <= localToday() : false;

  return (
    <Dialog open={releaseId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-3xl">
        {confirmDialog}
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 font-display">
            {roster ? `${roster.benefit.benefit_name} release batch` : "Release batch"}
            {status && <StatusPill tone={status.tone}>{status.label}</StatusPill>}
          </DialogTitle>
          <DialogDescription>
            {roster
              ? `Seniors receiving on ${longDate(roster.release_date)} (${roster.period_label}) · ${barangayNames}`
              : "Loading the seniors in this batch..."}
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {!roster && !error && (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
          </div>
        )}

        {roster && (
          <>
            <div className="grid grid-cols-3 gap-2">
              {[
                ["Seniors", items.length],
                ["Total amount", peso(total)],
                ["Received", `${received} of ${items.length}`],
              ].map(([label, value]) => (
                <div key={String(label)} className={tileClass}>
                  <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    {label}
                  </p>
                  <p className="mt-1 text-lg font-bold">{value}</p>
                </div>
              ))}
            </div>

            {roster.status === "released" && roster.completed_at && (
              <p className="text-xs text-muted-foreground">
                Completed {new Date(roster.completed_at).toLocaleString()}
                {roster.completer ? ` by ${roster.completer.name}` : ""}.
              </p>
            )}

            <section className={tileClass}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="flex items-center gap-2 text-sm font-bold">
                    <Paperclip className="h-4 w-4" /> Release documents
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Signed lists, photos of the release day, payroll copies. PDF or image, up to 10
                    MB each.
                  </p>
                </div>
                {canUpload && (
                  <>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => fileInput.current?.click()}
                      className={secondaryButtonClass}
                    >
                      {busy === "upload" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Paperclip className="h-4 w-4" />
                      )}
                      Upload
                    </button>
                    <input
                      ref={fileInput}
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={upload}
                      className="hidden"
                    />
                  </>
                )}
              </div>
              {roster.documents.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No documents uploaded yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-border/60">
                  {roster.documents.map((document) => (
                    <li key={document.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <PrivateFileLink
                          path={releaseDocumentUrl(roster.id, document)}
                          className="flex items-center gap-2 truncate text-sm font-semibold text-primary hover:underline"
                        >
                          <FileText className="h-4 w-4 shrink-0" />
                          <span className="truncate">{document.original_name}</span>
                        </PrivateFileLink>
                        <p className="text-xs text-muted-foreground">
                          {[
                            fileSize(document.size),
                            document.uploader?.name,
                            new Date(document.created_at).toLocaleDateString(),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      {(user?.role === "admin" || document.uploaded_by === user?.id) && (
                        <button
                          type="button"
                          onClick={() => removeDocument(document.id, document.original_name)}
                          aria-label={`Remove ${document.original_name}`}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="flex flex-wrap justify-end gap-2">
              {items.length > 0 && (
                <button type="button" onClick={exportRoster} className={secondaryButtonClass}>
                  <Download className="h-4 w-4" /> Export list
                </button>
              )}
              {canComplete && roster.status === "scheduled" && (
                <button
                  type="button"
                  disabled={busy !== null || !releaseDayReached}
                  onClick={completeBatch}
                  title={releaseDayReached ? undefined : "Available on or after the release date"}
                  className={primaryButtonClass}
                >
                  {busy === "complete" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Mark batch completed
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No seniors in this batch"
                description="No active senior on this benefit in these barangays was waiting for this period. Seniors already listed for the period are not listed again."
              />
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border/60">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      {["#", "OSCA ID", "Senior", "Barangay", "Amount", "Status"].map((heading) => (
                        <th
                          key={heading}
                          className="px-3 py-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.id} className="border-t border-border/60">
                        <td className="px-3 py-2.5 text-muted-foreground">{index + 1}</td>
                        <td className="px-3 py-2.5 font-mono text-xs">
                          {item.senior?.osca_id_number ?? "-"}
                        </td>
                        <td className="px-3 py-2.5 font-semibold">{seniorName(item)}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {item.senior?.barangay?.barangay_name ?? "-"}
                        </td>
                        <td className="px-3 py-2.5">{peso(Number(item.amount))}</td>
                        <td className="px-3 py-2.5">
                          <StatusPill
                            tone={
                              item.status === "released"
                                ? "success"
                                : item.status === "failed"
                                  ? "danger"
                                  : "gold"
                            }
                          >
                            {item.status === "released"
                              ? "Received"
                              : item.status === "failed"
                                ? "Not received"
                                : "Pending"}
                          </StatusPill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
