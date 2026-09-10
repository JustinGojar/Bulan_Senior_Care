import { createFileRoute } from "@tanstack/react-router";
import { Archive, Download, Eye, Pencil, Plus, Search, Trash2, Undo2, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useEffect } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { SeniorFormDialog } from "@/components/SeniorFormDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BARANGAYS, type Senior } from "@/lib/osca-data";
import { API_URL, apiFetch, getStoredUser, type ArchivedSenior, type BenefitTransaction, type PaginatedResponse } from "@/lib/api";
import { getSeniorEditRequests, reviewSeniorEditRequest, type SeniorEditRequest } from "@/lib/api";
import { loadPdfLogo } from "@/lib/pdf";
import { useSeniors } from "@/lib/use-seniors";

export const Route = createFileRoute("/seniors")({
  head: () => ({
    meta: [
      { title: "Senior Records — Bulan SeniorCare" },
      {
        name: "description",
        content:
          "Manage all registered senior citizens of Bulan: profiles, OSCA IDs, barangay, benefits, and eligibility status.",
      },
      { property: "og:title", content: "Senior Records — Bulan SeniorCare" },
      {
        property: "og:description",
        content: "Search, filter, and manage every registered senior citizen record in Bulan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SeniorRecords,
});

const STATUS_CLASS: Record<string, string> = {
  Active: "text-success",
  Pending: "text-gold-foreground",
  Inactive: "text-destructive",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function avatarPath(senior: Senior) {
  if (senior.photoPath) return senior.photoPath;
  return senior.idDocumentPath && /\.(jpe?g|png|webp)$/i.test(senior.idDocumentPath)
    ? senior.idDocumentPath
    : null;
}

function isImageDocument(path: string) {
  return /\.(jpe?g|png|webp)$/i.test(path);
}

function parseCsvRow(row: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (const character of row) {
    if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) {
      values.push(value.trim());
      value = "";
    } else value += character;
  }
  values.push(value.trim());
  return values;
}

function changedFields(request: SeniorEditRequest) {
  const changes = request.changes;
  const senior = request.senior;
  const currentName = senior ? [senior.first_name, senior.middle_name, senior.last_name].filter(Boolean).join(" ") : "";
  const nextName = [changes.first_name, changes.middle_name, changes.last_name].filter(Boolean).join(" ");
  const currentAge = senior?.birthdate ? new Date().getFullYear() - Number(String(senior.birthdate).slice(0, 4)) : null;
  const nextAge = changes.birthdate ? new Date().getFullYear() - Number(changes.birthdate.slice(0, 4)) : null;
  const fields: Array<[string, string | number, string | number]> = [];
  if (senior && currentName !== nextName) fields.push(["Name", currentName, nextName]);
  if (senior && currentAge !== nextAge) fields.push(["Age", currentAge ?? "None", nextAge ?? "None"]);
  if (senior && (senior.contact_number ?? "") !== (changes.contact_number ?? "")) fields.push(["Contact", senior.contact_number || "None", changes.contact_number || "None"]);
  if (senior && senior.barangay?.barangay_name !== changes.barangay) fields.push(["Barangay", senior.barangay?.barangay_name || "None", changes.barangay]);
  if (senior && senior.benefits?.[0]?.benefit_name !== changes.benefit) fields.push(["Benefit", senior.benefits[0]?.benefit_name || "None", changes.benefit]);
  if (senior && (senior.address ?? "") !== (changes.address ?? "")) fields.push(["Address", senior.address || "None", changes.address || "None"]);
  return fields;
}

function SeniorRecords() {
  const { seniors, totalCount, activeCount, pendingCount, createSenior, updateSenior, deleteSenior } = useSeniors();
  const currentUser = getStoredUser();
  const isHead = currentUser?.role === "head";
  const isLeader = currentUser?.role === "leader";
  const isAdmin = currentUser?.role === "admin";
  const [filter, setFilter] = useState<string>("All");
  const [barangayFilter, setBarangayFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Senior | null>(null);
  const [viewing, setViewing] = useState<Senior | null>(null);
  const [deleting, setDeleting] = useState<Senior | null>(null);
  const [editRequests, setEditRequests] = useState<SeniorEditRequest[]>([]);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archivedRecords, setArchivedRecords] = useState<ArchivedSenior[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [reviewingRequestId, setReviewingRequestId] = useState<number | null>(null);
  const [benefitTransactions, setBenefitTransactions] = useState<BenefitTransaction[]>([]);
  const bulkFileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isHead) getSeniorEditRequests().then(setEditRequests).catch(() => setEditRequests([]));
  }, [isHead]);

  useEffect(() => {
    if (!viewing) return;
    setBenefitTransactions([]);
    apiFetch<PaginatedResponse<BenefitTransaction>>(`/benefit-transactions?page=1&per_page=50`)
      .then((result) => setBenefitTransactions(result.data))
      .catch(() => setBenefitTransactions([]));
  }, [viewing]);

  async function reviewEditRequest(request: SeniorEditRequest, status: "approved" | "declined") {
    setReviewingRequestId(request.id);
    try {
      await reviewSeniorEditRequest(request.id, status);
      setEditRequests((current) => current.filter((item) => item.id !== request.id));
      toast.success(status === "approved" ? "Senior record update approved." : "Senior record update declined.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to review edit request.");
    } finally {
      setReviewingRequestId(null);
    }
  }

  const filters = useMemo(
    () => [
      { key: "All", count: totalCount },
      { key: "Active", count: activeCount },
      { key: "Pending", count: pendingCount },
      { key: "Inactive", count: seniors.filter((s) => s.status === "Inactive").length },
    ],
    [seniors, totalCount, activeCount, pendingCount],
  );

  const rows = useMemo(
    () =>
      seniors
        .filter((s) => (filter === "All" ? true : s.status === filter))
        .filter((s) => (barangayFilter === "All" ? true : s.barangay === barangayFilter))
        .filter(
          (s) =>
            s.name.toLowerCase().includes(query.toLowerCase()) ||
            s.id.toLowerCase().includes(query.toLowerCase()),
        )
        .sort((first, second) => first.name.localeCompare(second.name, undefined, { sensitivity: "base" })),
    [seniors, filter, barangayFilter, query],
  );

  async function openArchive() {
    setArchiveOpen(true);
    setArchiveLoading(true);
    try {
      const result = await apiFetch<{ data: ArchivedSenior[] }>("/seniors/archive");
      setArchivedRecords(result.data.filter((record): record is ArchivedSenior => Boolean(record?.osca_id_number)));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load the archive.");
    } finally {
      setArchiveLoading(false);
    }
  }

  async function restoreRecord(oscaId: string) {
    try {
      await apiFetch(`/seniors/archive/${encodeURIComponent(oscaId)}/restore`, { method: "POST" });
      setArchivedRecords((records) => records.filter((record) => record.osca_id_number !== oscaId));
      toast.success(`${oscaId} was restored.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to restore the record.");
    }
  }

  async function handleBulkFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const lines = (await file.text()).split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) {
      toast.error("The CSV must contain a header row and at least one senior record.");
      return;
    }
    const headers = parseCsvRow(lines[0]!).map((header) => header.toLowerCase().replace(/\s+/g, "_"));
    const records = lines.slice(1).map((line) => {
      const values = parseCsvRow(line);
      return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    });
    let created = 0;
    let failed = 0;
    for (const record of records) {
      const birthdate = new Date(`${record.birthdate}T00:00:00`);
      const age = Number.isNaN(birthdate.getTime()) ? 60 : new Date().getFullYear() - birthdate.getFullYear();
      try {
        await createSenior({
          name: [record.first_name, record.middle_name, record.last_name].filter(Boolean).join(" "),
          firstName: record.first_name,
          middleName: record.middle_name,
          lastName: record.last_name,
          age,
          barangay: record.barangay,
          contact: record.contact_number,
          benefit: record.benefit || "Social Pension",
          status: "Pending",
        });
        created += 1;
      } catch {
        failed += 1;
      }
    }
    if (failed) toast.error(`${created} records added, ${failed} records failed.`);
    else toast.success(`${created} senior records added and are pending review.`);
  }

  async function exportRecords() {
    if (rows.length === 0) {
      toast.error("There are no senior records to export.");
      return;
    }

    try {
      const { jsPDF } = await import("jspdf");
      const document = new jsPDF({ orientation: "landscape" });
      const generatedDate = new Date();
      const logoDataUrl = await loadPdfLogo();

      document.addImage(logoDataUrl, "PNG", 14, 7, 14, 14);
      document.setFontSize(18);
      document.text("Bulan SeniorCare", 32, 18);
      document.setFontSize(13);
      document.text("Senior Citizen Records", 14, 28);
      document.setFontSize(9);
      document.text(`Generated: ${generatedDate.toLocaleDateString()}`, 14, 36);
      document.text(`Records: ${rows.length}`, 14, 43);

      let y = 56;
      document.setFontSize(9);
      document.setFont("helvetica", "bold");
      document.text("Senior ID", 14, y);
      document.text("Name", 48, y);
      document.text("Age", 118, y);
      document.text("Barangay", 138, y);
      document.text("Contact", 195, y);
      document.text("Benefit", 235, y);
      document.text("Status", 275, y);
      document.setFont("helvetica", "normal");
      y += 7;

      rows.forEach((senior) => {
        if (y > 195) {
          document.addPage();
          y = 18;
        }
        document.text(senior.id, 14, y);
        document.text(document.splitTextToSize(senior.name, 62)[0] ?? senior.name, 48, y);
        document.text(String(senior.age), 118, y);
        document.text(document.splitTextToSize(senior.barangay, 52)[0] ?? senior.barangay, 138, y);
        document.text(document.splitTextToSize(senior.contact, 34)[0] ?? senior.contact, 195, y);
        document.text(document.splitTextToSize(senior.benefit, 34)[0] ?? senior.benefit, 235, y);
        document.text(senior.status, 275, y);
        y += 7;
      });

      document.save(`bulan-seniorcare-records-${generatedDate.toISOString().slice(0, 10)}.pdf`);
      toast.success("Senior records exported as PDF.");
    } catch {
      toast.error("Unable to export senior records.");
    }
  }

  return (
    <AppShell
      title="Senior Record"
      subtitle="Manage all registered senior citizens"
      breadcrumb={["Dashboard", "Senior Records"]}
      actions={
        <div className="flex gap-3">
          {(isLeader || isAdmin) && (
                <>
                  <button
                    onClick={() => bulkFileInput.current?.click()}
                    className="inline-flex items-center gap-2 rounded-full bg-card px-6 py-3.5 text-sm font-semibold shadow-[var(--shadow-soft)]"
                  >
                    <Upload className="h-4 w-4" /> Bulk record
                  </button>
                  <input ref={bulkFileInput} type="file" accept=".csv,text/csv" onChange={handleBulkFile} className="hidden" />
                  <button
                    onClick={() => {
                      setEditing(null);
                      setFormOpen(true);
                    }}
                    className="bg-navy inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-card)]"
                  >
                    <Plus className="h-4 w-4" /> Register Senior
                  </button>
                </>
          )}
          {isAdmin && (
            <button
              onClick={openArchive}
              className="inline-flex items-center gap-2 rounded-full bg-card px-6 py-3.5 text-sm font-semibold shadow-[var(--shadow-soft)]"
            >
              <Archive className="h-4 w-4" /> Archive
            </button>
          )}
          <button
            type="button"
            onClick={exportRecords}
            className="inline-flex items-center gap-2 rounded-full bg-card px-6 py-3.5 text-sm font-semibold shadow-[var(--shadow-soft)]"
          >
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={
              filter === f.key
                ? "bg-navy rounded-full px-6 py-3 text-sm font-bold text-primary-foreground shadow-[var(--shadow-soft)]"
                : "rounded-full bg-card px-6 py-3 text-sm font-semibold text-muted-foreground shadow-[var(--shadow-soft)]"
            }
          >
            {f.key} <span className="ml-1 opacity-70">{f.count}</span>
          </button>
        ))}
        {!isLeader && (
          <select
            value={barangayFilter}
            onChange={(event) => setBarangayFilter(event.target.value)}
            aria-label="Filter by barangay"
            className="h-12 min-w-[240px] rounded-full bg-card px-5 text-sm font-semibold text-foreground shadow-[var(--shadow-soft)] outline-none focus:ring-2 focus:ring-ring/30"
          >
            <option value="All">All barangays</option>
            {BARANGAYS.map((barangay) => (
              <option key={barangay} value={barangay}>
                {barangay}
              </option>
            ))}
          </select>
        )}
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or OSCA ID..."
            className="h-12 w-full rounded-full bg-card pr-4 pl-11 text-sm shadow-[var(--shadow-soft)] outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>

      {isHead && editRequests.length > 0 && (
        <section className="surface-card mt-6 p-6">
          <div>
            <h2 className="text-lg font-bold">Senior record edit requests</h2>
            <p className="mt-1 text-sm text-muted-foreground">Review changes submitted by Barangay Leaders before they update the official record.</p>
          </div>
          <div className="mt-5 space-y-3">
            {editRequests.map((request) => (
              <div key={request.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-secondary p-4">
                <div className="text-sm">
                  <p className="font-bold">{request.senior ? [request.senior.first_name, request.senior.middle_name, request.senior.last_name].filter(Boolean).join(" ") : [request.changes?.first_name, request.changes?.middle_name, request.changes?.last_name].filter(Boolean).join(" ") || "Senior record"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{request.senior?.osca_id_number ?? "Senior record"} · Requested by {request.requester?.name ?? "Unknown user"}</p>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {changedFields(request).map(([field, current, next]) => (
                      <p key={field}><span className="font-semibold text-foreground">{field}:</span> {current} to {next}</p>
                    ))}
                    {changedFields(request).length === 0 && <p>No changed values found.</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" disabled={reviewingRequestId === request.id} onClick={() => reviewEditRequest(request, "declined")} className="rounded-full bg-card px-4 py-2.5 text-sm font-semibold text-destructive disabled:opacity-50">{reviewingRequestId === request.id ? "Saving..." : "Decline"}</button>
                  <button type="button" disabled={reviewingRequestId === request.id} onClick={() => reviewEditRequest(request, "approved")} className="bg-navy rounded-full px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{reviewingRequestId === request.id ? "Saving..." : "Approve"}</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="surface-card mt-6 overflow-x-auto p-2">
        <table className="w-full min-w-[880px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              {["Name", "Senior ID", "Age", "Barangay", "Contact", "Benefit", "Status", "Actions"].map(
                (h) => (
                  <th key={h} className="px-5 py-5 font-bold text-foreground">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="bg-navy grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full text-[11px] font-bold text-primary-foreground">
                      {avatarPath(s) ? (
                        <img
                          src={`${API_URL.replace(/\/api$/, "")}/storage/${avatarPath(s)}`}
                          alt={`${s.name} profile`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initials(s.name)
                      )}
                    </span>
                    <span className="font-medium">{s.name}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-muted-foreground">{s.id}</td>
                <td className="px-5 py-4">{s.age}</td>
                <td className="px-5 py-4 text-muted-foreground">{s.barangay}</td>
                <td className="px-5 py-4 text-muted-foreground">{s.contact}</td>
                <td className="px-5 py-4">{s.benefit}</td>
                <td className={`px-5 py-4 font-bold ${STATUS_CLASS[s.status]}`}>{s.status}</td>
                <td className="px-5 py-4">
                  <div className="flex gap-2">
                    <button
                      aria-label={`View record of ${s.name}`}
                      onClick={() => setViewing(s)}
                      className="grid h-9 w-9 place-items-center rounded-full bg-secondary transition-colors hover:bg-muted"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      aria-label={`Edit record of ${s.name}`}
                      onClick={() => {
                        setEditing(s);
                        setFormOpen(true);
                      }}
                      className="grid h-9 w-9 place-items-center rounded-full bg-secondary transition-colors hover:bg-muted"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {isAdmin && (
                        <button
                          aria-label={`Delete record of ${s.name}`}
                          onClick={() => setDeleting(s)}
                          className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-destructive transition-colors hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                    )}
                    {!isAdmin && (
                      <button
                        aria-label={`Archive record of ${s.name}`}
                        title="Archive record"
                        onClick={async () => {
                          if (!window.confirm(`Archive the record of ${s.name}?`)) return;
                          try {
                            await apiFetch(`/seniors/${encodeURIComponent(s.id)}/archive`, { method: "POST" });
                            toast.success(`${s.name}'s record was archived.`);
                            window.location.reload();
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "Unable to archive the record.");
                          }
                        }}
                        className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-muted-foreground transition-colors hover:bg-muted"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                  No records match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Deleted record archive</DialogTitle>
            <DialogDescription>OSCA IDs for records deleted by an administrator.</DialogDescription>
          </DialogHeader>
          {archiveLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading archive...</p>
          ) : archivedRecords.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No deleted records.</p>
          ) : (
            <div className="max-h-80 divide-y divide-border overflow-y-auto">
              {archivedRecords.map((record) => (
                <div key={record.osca_id_number} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="font-semibold">{record.osca_id_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {[record.first_name, record.last_name].filter(Boolean).join(" ")} · Deleted {new Date(record.deleted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => restoreRecord(record.osca_id_number)}
                    aria-label={`Restore ${record.osca_id_number}`}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-foreground transition-colors hover:bg-muted"
                  >
                    <Undo2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {(!isHead || !!editing) && (
        <SeniorFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          senior={editing}
          isLeader={isLeader}
          leaderBarangay={isLeader ? BARANGAYS[(currentUser?.barangay_id ?? 0) - 1] : undefined}
          onSubmit={async (draft) => {
            try {
              if (editing) {
                await updateSenior(editing.id, draft);
                toast.success(isLeader ? "Update request sent to the Head for approval." : `${draft.name}'s record was updated.`);
              } else {
                await createSenior(draft);
                toast.success(`${draft.name} was registered and is pending review.`);
              }
            } catch (reason) {
              toast.error(reason instanceof Error ? reason.message : "Unable to register senior.");
            }
          }}
        />
      )}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{viewing?.name}</DialogTitle>
            <DialogDescription>OSCA ID {viewing?.id}</DialogDescription>
          </DialogHeader>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            {[
              ["Age", viewing?.age],
              ["Barangay", viewing?.barangay],
              ["Contact", viewing?.contact],
              ["Benefit", viewing?.benefit],
              ["Status", viewing?.status],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          {(() => {
            const history = benefitTransactions
              .filter((transaction) => transaction.senior.osca_id_number === viewing?.id)
              .sort((first, second) => {
                const firstDate = first.date_distributed ?? first.created_at;
                const secondDate = second.date_distributed ?? second.created_at;
                return new Date(firstDate).getTime() - new Date(secondDate).getTime();
              });
            const latest = history.at(-1);
            return (
              <div className="mt-5 border-t border-border pt-5">
                <p className="text-sm font-bold">Benefit release history</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Latest release: {latest?.date_distributed ? new Date(`${latest.date_distributed}T00:00:00`).toLocaleDateString() : "No release recorded"}
                </p>
                {history.length > 0 && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[480px] text-xs">
                      <thead>
                        <tr className="border-b border-border text-left text-muted-foreground">
                          <th className="px-2 py-2">Release period</th>
                          <th className="px-2 py-2">Actual date</th>
                          <th className="px-2 py-2">Amount</th>
                          <th className="px-2 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((transaction) => (
                          <tr key={transaction.id} className="border-b border-border last:border-0">
                            <td className="px-2 py-2 font-semibold">{transaction.period_label ?? "-"}</td>
                            <td className="px-2 py-2">{transaction.date_distributed ? new Date(`${transaction.date_distributed}T00:00:00`).toLocaleDateString() : "-"}</td>
                            <td className="px-2 py-2">₱{Number(transaction.amount).toLocaleString()}</td>
                            <td className="px-2 py-2 font-semibold">{transaction.status === "released" ? "Released" : transaction.status === "failed" ? "Not received" : "Pending"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}
          {(viewing?.photoPath || viewing?.idDocumentPath || viewing?.validIdPath || viewing?.birthCertificatePath) && (
            <div className="mt-5 border-t border-border pt-5">
              <p className="text-sm font-bold">Submitted files</p>
              <div className="mt-3 flex flex-wrap items-start gap-4">
                {viewing.photoPath && (
                  <a
                    href={`${API_URL.replace(/\/api$/, "")}/storage/${viewing.photoPath}`}
                    target="_blank"
                    rel="noreferrer"
                    className="overflow-hidden rounded-xl border border-border"
                  >
                    <img
                      src={`${API_URL.replace(/\/api$/, "")}/storage/${viewing.photoPath}`}
                      alt={`${viewing.name} profile`}
                      className="h-24 w-24 object-cover"
                    />
                  </a>
                )}
                {viewing.idDocumentPath && !viewing.validIdPath && (
                  <a
                    href={`${API_URL.replace(/\/api$/, "")}/storage/${viewing.idDocumentPath}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col gap-2 text-sm font-semibold"
                  >
                    {isImageDocument(viewing.idDocumentPath) && (
                      <img src={`${API_URL.replace(/\/api$/, "")}/storage/${viewing.idDocumentPath}`} alt="Valid ID" className="h-24 w-24 rounded-xl border border-border object-cover" />
                    )}
                    <span>Valid ID</span>
                  </a>
                )}
                {viewing.validIdPath && (
                  <a
                    href={`${API_URL.replace(/\/api$/, "")}/storage/${viewing.validIdPath}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col gap-2 text-sm font-semibold"
                  >
                    {isImageDocument(viewing.validIdPath) && (
                      <img src={`${API_URL.replace(/\/api$/, "")}/storage/${viewing.validIdPath}`} alt="Valid ID" className="h-24 w-24 rounded-xl border border-border object-cover" />
                    )}
                    <span>Valid ID</span>
                  </a>
                )}
                {viewing.birthCertificatePath && (
                  <a
                    href={`${API_URL.replace(/\/api$/, "")}/storage/${viewing.birthCertificatePath}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col gap-2 text-sm font-semibold"
                  >
                    {isImageDocument(viewing.birthCertificatePath) && (
                      <img src={`${API_URL.replace(/\/api$/, "")}/storage/${viewing.birthCertificatePath}`} alt="Birth Certificate" className="h-24 w-24 rounded-xl border border-border object-cover" />
                    )}
                    <span>Birth Certificate</span>
                  </a>
                )}
                {!viewing.birthCertificatePath && (
                  <span className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                    Birth Certificate not uploaded
                  </span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this senior record?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.name} ({deleting?.id}) will be removed from the OSCA registry. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleting) return;
                deleteSenior(deleting.id);
                toast.success(`${deleting.name}'s record was deleted.`);
                setDeleting(null);
              }}
            >
              Delete record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
