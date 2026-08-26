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
import { API_URL, apiFetch, getStoredUser, type ArchivedSenior } from "@/lib/api";
import { getSeniorEditRequests, reviewSeniorEditRequest, type SeniorEditRequest } from "@/lib/api";
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

function SeniorRecords() {
  const { seniors, totalCount, activeCount, pendingCount, createSenior, updateSenior, deleteSenior } = useSeniors();
  const currentUser = getStoredUser();
  const isHead = currentUser?.role === "head";
  const isLeader = currentUser?.role === "leader";
  const isAdmin = currentUser?.role === "admin";
  const [filter, setFilter] = useState<string>("Active");
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
  const bulkFileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isHead) getSeniorEditRequests().then(setEditRequests).catch(() => setEditRequests([]));
  }, [isHead]);

  async function reviewEditRequest(request: SeniorEditRequest, status: "approved" | "declined") {
    try {
      await reviewSeniorEditRequest(request.id, status);
      setEditRequests((current) => current.filter((item) => item.id !== request.id));
      toast.success(status === "approved" ? "Senior record update approved." : "Senior record update declined.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to review edit request.");
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
        ),
    [seniors, filter, barangayFilter, query],
  );

  async function openArchive() {
    setArchiveOpen(true);
    setArchiveLoading(true);
    try {
      const result = await apiFetch<{ data: ArchivedSenior[] }>("/seniors/archive");
      setArchivedRecords(result.data);
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

      document.setFontSize(18);
      document.text("Bulan SeniorCare", 14, 18);
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
          {isLeader && (
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
                  <p className="font-bold">{request.changes.first_name} {request.changes.middle_name} {request.changes.last_name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{request.senior.osca_id_number} · Requested by {request.requester.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Age {new Date().getFullYear() - Number(request.changes.birthdate.slice(0, 4))} · {request.changes.contact_number || "No contact"} · {request.changes.benefit}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => reviewEditRequest(request, "declined")} className="rounded-full bg-card px-4 py-2.5 text-sm font-semibold text-destructive">Decline</button>
                  <button type="button" onClick={() => reviewEditRequest(request, "approved")} className="bg-navy rounded-full px-4 py-2.5 text-sm font-semibold text-primary-foreground">Approve</button>
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
          isLeader={isLeader}
          onSubmit={async (draft) => {
            if (editing) {
              await updateSenior(editing.id, draft);
              toast.success(isLeader ? "Update request sent to the Head for approval." : `${draft.name}'s record was updated.`);
            } else {
              await createSenior(draft);
              toast.success(`${draft.name} was registered and is pending review.`);
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
          {(viewing?.photoPath || viewing?.idDocumentPath) && (
            <div className="mt-5 border-t border-border pt-5">
              <p className="text-sm font-bold">Submitted files</p>
              <div className="mt-3 flex flex-wrap gap-3">
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
                {viewing.idDocumentPath && (
                  <a
                    href={`${API_URL.replace(/\/api$/, "")}/storage/${viewing.idDocumentPath}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl bg-secondary px-4 py-3 text-sm font-semibold"
                  >
                    Open supporting document
                  </a>
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
