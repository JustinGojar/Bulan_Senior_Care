import { createFileRoute } from "@tanstack/react-router";
import { Archive, Clipboard, Download, Eye, Pencil, Plus, Search, Trash2, Undo2, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useEffect } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
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
import { API_URL, apiFetch, bulkCreateSeniors, getStoredUser, type ArchivedSenior, type BenefitTransaction, type PaginatedResponse } from "@/lib/api";
import { getSeniorEditRequests, reviewSeniorEditRequest, type SeniorEditRequest } from "@/lib/api";
import { loadPdfLogo } from "@/lib/pdf";
import { useSeniors, type SeniorDraft } from "@/lib/use-seniors";

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

function normalizeBulkHeader(header: unknown) {
  return String(header ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function normalizeBulkDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
  }
  const text = String(value ?? "").trim();
  if (!text) return "";
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : parsed.toISOString().slice(0, 10);
}

async function readBulkRecords(file: File) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]!];
  if (!sheet) return [] as Record<string, unknown>[];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  const headers = (rows[0] ?? []).map(normalizeBulkHeader);
  return rows.slice(1)
    .filter((row) => row.some((value) => String(value ?? "").trim()))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

async function imageDataUrl(source: File | string) {
  const response = typeof source === "string" ? await fetch(source) : null;
  if (response && !response.ok) throw new Error("Profile photo could not be loaded.");
  const blob = response ? await response.blob() : source;
  const objectUrl = URL.createObjectURL(blob);
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const size = Math.min(image.naturalWidth || 600, image.naturalHeight || 600);
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Unable to prepare profile photo."));
        return;
      }
      const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
      const offsetX = (image.naturalWidth - cropSize) / 2;
      const offsetY = (image.naturalHeight - cropSize) / 2;
      context.drawImage(image, offsetX, offsetY, cropSize, cropSize, 0, 0, size, size);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read profile photo."));
    };
    image.src = objectUrl;
  });
}

async function downloadRegistrationForm(draft: SeniorDraft) {
  const { jsPDF } = await import("jspdf");
  const document = new jsPDF();
  const pageWidth = document.internal.pageSize.getWidth();
  const left = 18;
  const right = pageWidth - 18;

  document.setDrawColor(35, 45, 55);
  document.setLineWidth(0.4);
  document.rect(left, 12, 40, 45);
  document.setFont("helvetica", "bold");
  document.setFontSize(7);
  document.text("AN KAUPOD PO SANI NA", left + 3, 18);
  document.text("DOKUMENTO:", left + 3, 23);
  document.setFont("helvetica", "normal");
  ["1x1 PICTURE - 2pcs", "Birth Certificate", "Baptismal", "GSIS ID", "SSS ID", "Voter's ID", "National ID", "Brgy. ID", "Driver's License", "Passport ID"].forEach((item, index) => document.text(`> ${item}`, left + 3, 29 + index * 3.8));

  document.setFont("helvetica", "bold");
  document.setFontSize(10);
  document.text("OFFICE OF THE SENIOR CITIZEN'S AFFAIRS", 112, 19, { align: "center" });
  document.setFontSize(8);
  document.text("Municipality of Bulan, Sorsogon", 112, 25, { align: "center" });
  document.setFontSize(16);
  document.setTextColor(33, 91, 125);
  document.text("REGISTRATION FORM", 112, 39, { align: "center" });
  const oscaId = draft.id ?? draft.oscaIdNumber;
  if (oscaId) {
    document.setFontSize(9);
    document.setTextColor(0, 0, 0);
    document.text(`OSCA ID: ${oscaId}`, 112, 46, { align: "center" });
  }
  document.setTextColor(0, 0, 0);
  document.setDrawColor(35, 45, 55);
  document.rect(166, 13, 25, 25);
  const photoSource = draft.profilePhoto ?? (draft.photoPath ? `${API_URL.replace(/\/api$/, "")}/storage/${draft.photoPath}` : null);
  if (photoSource) {
    try {
      const photoDataUrl = await imageDataUrl(photoSource);
      document.addImage(photoDataUrl, "JPEG", 167, 14, 23, 23);
    } catch {
      document.setFontSize(13);
      document.text("1x1", 178.5, 24, { align: "center" });
      document.setFontSize(6);
      document.text("Picture", 178.5, 31, { align: "center" });
    }
  } else {
    document.setFontSize(13);
    document.text("1x1", 178.5, 24, { align: "center" });
    document.setFontSize(6);
    document.text("Picture", 178.5, 31, { align: "center" });
  }

  let y = 68;
  const line = (label: string, value: string, x: number, endX: number, lineY = y) => {
    document.setFont("helvetica", "bold");
    document.setFontSize(7.5);
    document.text(`${label}:`, x, lineY);
    document.setFont("helvetica", "normal");
    const startX = x + Math.max(25, document.getTextWidth(`${label}:`) + 2);
    document.line(startX, lineY + 1, endX, lineY + 1);
    if (value) document.text(document.splitTextToSize(value, Math.max(8, endX - startX - 2))[0] ?? value, startX + 2, lineY - 1);
  };
  document.setFont("helvetica", "bold");
  document.setFontSize(7.5);
  line("NAME", "", left, right);
  document.setFont("helvetica", "normal");
  document.setFontSize(7);
  document.text(draft.lastName ?? "", 43, y - 1, { align: "center" });
  document.text(draft.firstName ?? "", 101, y - 1, { align: "center" });
  document.text(draft.middleName ?? "", 157, y - 1, { align: "center" });
  document.setFontSize(6.5);
  document.text("(Surname)", 43, y + 5, { align: "center" });
  document.text("(First Name)", 101, y + 5, { align: "center" });
  document.text("(Middle Name)", 157, y + 5, { align: "center" });
  y += 15;
  line("PLACE OF BIRTH", draft.placeOfBirth ?? "", left, 104);
  line("AGE", String(draft.age || ""), 109, 143);
  line("CIVIL STATUS", draft.civilStatus ?? "", 146, right);
  y += 8;
  line("DATE OF BIRTH", draft.birthdate ?? "", left, 111);
  line("SEX", draft.sex ?? "", 115, right);
  y += 8;
  line("ADDRESS", draft.address, left, right);
  y += 8;
  line("EDUCATIONAL ATTAINMENT", draft.educationalAttainment ?? "", left, right);
  y += 8;
  line("OTHER SKILLS", draft.otherSkills ?? "", left, right);

  y += 10;
  document.setFont("helvetica", "bold");
  document.setFontSize(10);
  document.text("FAMILY COMPOSITION", pageWidth / 2, y, { align: "center" });
  y += 4;
  const tableTop = y;
  const tableHeight = 31;
  document.rect(left, tableTop, right - left, tableHeight);
  [64, 112, 139, 166].forEach((x) => document.line(x, tableTop, x, tableTop + tableHeight));
  [tableTop + 7, tableTop + 13, tableTop + 19, tableTop + 25].forEach((rowY) => document.line(left, rowY, right, rowY));
  document.setFontSize(7);
  document.text("NAME", 42, tableTop + 5, { align: "center" });
  document.text("RELATIONSHIP", 88, tableTop + 5, { align: "center" });
  document.text("AGE", 125, tableTop + 5, { align: "center" });
  document.text("STATUS", 152, tableTop + 5, { align: "center" });
  document.text("OCCUPATION", 178, tableTop + 5, { align: "center" });
  document.setFont("helvetica", "normal");
  document.text(document.splitTextToSize(draft.familyComposition ?? "", 170)[0] ?? "", left + 2, tableTop + 11);

  y = tableTop + tableHeight + 13;
  document.setFont("helvetica", "bold");
  document.setFontSize(10);
  document.text("MEMBERSHIP TO SENIOR CITIZEN ASSOCIATION", pageWidth / 2, y, { align: "center" });
  y += 9;
  line("NAME OF ASSOCIATION", draft.associationName ?? "", left, right);
  y += 8;
  line("ADDRESS OF ASSOCIATION", draft.associationAddress ?? "", left, right);
  y += 8;
  line("DATE OF MEMBERSHIP", draft.associationMembershipDate ?? "", left, 111);
  line("POSITION", draft.associationPosition ?? "", 115, right);
  y += 17;
  document.setFont("helvetica", "normal");
  document.setFontSize(8);
  document.text("Signature of Ass. Pres. / Representative", 139, y, { align: "center" });
  y += 14;
  document.setFont("helvetica", "bold");
  document.text("I certify that the above information are true and correct in the best of my", pageWidth / 2, y, { align: "center" });
  document.text("knowledge and belief.", pageWidth / 2, y + 5, { align: "center" });
  y += 25;
  document.line(125, y, right, y);
  document.setFont("helvetica", "normal");
  document.text("Signature or thumb mark of Senior Citizen", 158, y + 6, { align: "center" });
  document.save(`osca-registration-${(draft.lastName || "senior").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`);
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
  const { seniors, totalCount, activeCount, pendingCount, loading, error, createSenior, updateSenior, deleteSenior } = useSeniors();
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
  const [bulkPreview, setBulkPreview] = useState<Array<Record<string, string>> | null>(null);
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

    let records: Record<string, unknown>[];
    try {
      records = await readBulkRecords(file);
    } catch {
      toast.error("Unable to read the file. Please upload a valid CSV or Excel file.");
      return;
    }
    if (records.length === 0) {
      toast.error("The file must contain a header row and at least one senior record.");
      return;
    }
    const normalizedRecords = records.map((record) => {
      const birthdate = normalizeBulkDate(record["birthdate"] ?? record["date_of_birth"] ?? record["dob"]);
      const age = new Date().getFullYear() - Number(birthdate.slice(0, 4));
      const benefit = String(record["benefit"] ?? (age >= 100 ? "Centenarian Award" : age >= 90 ? "Nonagenarian Grant" : age >= 80 ? "Octogenarian Grant" : "Social Pension")).trim();
      return {
        first_name: String(record["first_name"] ?? "").trim(),
        middle_name: String(record["middle_name"] ?? "").trim(),
        last_name: String(record["last_name"] ?? "").trim(),
        birthdate,
        sex: String(record["sex"] ?? "").toLowerCase(),
        contact_number: String(record["contact_number"] ?? record["contact"] ?? "").trim(),
        barangay: String(record["barangay"] ?? "").trim(),
        address: String(record["address"] ?? "").trim(),
        benefit,
      };
    });
    setBulkPreview(normalizedRecords);
  }

  async function confirmBulkImport() {
    if (!bulkPreview) return;
    try {
      const result = await bulkCreateSeniors(bulkPreview);
      const failed = result.failed.length;
      if (failed) toast.error(`${result.created.length} records added, ${failed} failed. ${result.failed[0]?.message ?? "Check the uploaded data."}`);
      else toast.success(`${result.created.length} senior records added and are pending review.`);
      setBulkPreview(null);
      window.location.reload();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Bulk upload failed.");
    }
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
                  <input ref={bulkFileInput} type="file" accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleBulkFile} className="hidden" />
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
            <p className="mt-1 text-sm text-muted-foreground">Review changes submitted by BSCA before they update the official record.</p>
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
            {loading ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                  Loading senior records...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-destructive">
                  Unable to load senior records. Please refresh and try again.
                </td>
              </tr>
            ) : rows.map((s) => (
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
            {!loading && !error && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                  No records match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!bulkPreview} onOpenChange={(open) => !open && setBulkPreview(null)}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Preview bulk import</DialogTitle>
            <DialogDescription>
              Review {bulkPreview?.length ?? 0} records before importing. Invalid rows will be rejected by the server.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary">
                <tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Birthdate</th><th className="px-3 py-2">Sex</th><th className="px-3 py-2">Barangay</th></tr>
              </thead>
              <tbody>
                {(bulkPreview ?? []).slice(0, 50).map((record, index) => (
                  <tr key={`${record.first_name}-${record.last_name}-${index}`} className="border-t border-border">
                    <td className="px-3 py-2">{record.first_name} {record.last_name}</td>
                    <td className="px-3 py-2">{record.birthdate}</td>
                    <td className="px-3 py-2">{record.sex || "Missing"}</td>
                    <td className="px-3 py-2">{record.barangay || "Missing"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setBulkPreview(null)} className="rounded-full bg-secondary px-5 py-3 text-sm font-semibold">Cancel</button>
            <button type="button" onClick={confirmBulkImport} className="bg-navy rounded-full px-5 py-3 text-sm font-semibold text-primary-foreground">Import records</button>
          </div>
        </DialogContent>
      </Dialog>

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
                const created = await createSenior(draft);
                await downloadRegistrationForm({ ...draft, id: created.id });
                toast.success(`${draft.name} was registered and is pending review.`);
              }
            } catch (reason) {
              toast.error(reason instanceof Error ? reason.message : "Unable to register senior.");
            }
          }}
        />
      )}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto bg-slate-50 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">{viewing?.name}</DialogTitle>
            <DialogDescription className="flex items-center gap-2 text-xs">
              OSCA ID {viewing?.id}
              {viewing?.id && (
                <button type="button" className="inline-flex items-center gap-1 font-semibold text-foreground" onClick={() => navigator.clipboard.writeText(viewing.id).then(() => toast.success("OSCA ID copied."))}>
                  <Clipboard className="h-3 w-3" /> Copy
                </button>
              )}
            </DialogDescription>
          </DialogHeader>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
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
          <div className="mt-5 border-t border-border pt-5">
            <p className="text-sm font-bold">Registration information</p>
            <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              {[
                ["Place of birth", viewing?.placeOfBirth || "Not provided"],
                ["Date of birth", viewing?.birthdate || "Not provided"],
                ["Sex", viewing?.sex ? viewing.sex.charAt(0).toUpperCase() + viewing.sex.slice(1) : "Not provided"],
                ["Civil status", viewing?.civilStatus || "Not provided"],
                ["Address", viewing?.address || "Not provided"],
                ["Educational attainment", viewing?.educationalAttainment || "Not provided"],
                ["Other skills", viewing?.otherSkills || "Not provided"],
              ].map(([label, value]) => (
                <div key={String(label)} className={label === "Address" || label === "Educational attainment" || label === "Other skills" ? "col-span-2" : ""}>
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="mt-5 border-t border-border pt-5">
            <p className="text-sm font-bold">Family composition</p>
            <p className="mt-2 whitespace-pre-line rounded-xl bg-secondary px-3 py-3 text-sm">
              {viewing?.familyComposition || "Not provided"}
            </p>
          </div>
          <div className="mt-5 border-t border-border pt-5">
            <p className="text-sm font-bold">Senior citizen association</p>
            <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              {[
                ["Name of association", viewing?.associationName || "Not provided"],
                ["Address of association", viewing?.associationAddress || "Not provided"],
                ["Date of membership", viewing?.associationMembershipDate || "Not provided"],
                ["Position", viewing?.associationPosition || "Not provided"],
              ].map(([label, value]) => (
                <div key={String(label)} className={label === "Name of association" || label === "Address of association" ? "col-span-2" : ""}>
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
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
                    <table className="w-full table-fixed text-xs">
                      <thead>
                        <tr className="border-b border-border text-left text-muted-foreground">
                          <th className="w-[34%] px-1 py-2">Release period</th>
                          <th className="w-[22%] px-1 py-2">Actual date</th>
                          <th className="w-[20%] px-1 py-2">Amount</th>
                          <th className="w-[24%] px-1 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((transaction) => (
                          <tr key={transaction.id} className="border-b border-border last:border-0">
                            <td className="truncate px-1 py-2 font-semibold">{transaction.period_label ?? "-"}</td>
                            <td className="truncate px-1 py-2">{transaction.date_distributed ? new Date(`${transaction.date_distributed}T00:00:00`).toLocaleDateString() : "-"}</td>
                            <td className="truncate px-1 py-2">₱{Number(transaction.amount).toLocaleString()}</td>
                            <td className="truncate px-1 py-2 font-semibold">{transaction.status === "released" ? "Released" : transaction.status === "failed" ? "Not received" : "Pending"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}
          {viewing && (
            <div className="mt-5 border-t border-border pt-5">
              <p className="text-sm font-bold">Submitted files</p>
              <div className="mt-3 flex flex-wrap items-start gap-3">
                {viewing.photoPath && (
                  <a
                    href={`${API_URL.replace(/\/api$/, "")}/storage/${viewing.photoPath}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-20 flex-col gap-2 text-xs font-semibold"
                  >
                    <img
                      src={`${API_URL.replace(/\/api$/, "")}/storage/${viewing.photoPath}`}
                      alt={`${viewing.name} profile`}
                      className="h-20 w-20 rounded-xl border border-border object-cover"
                    />
                    <span>Profile photo</span>
                  </a>
                )}
                {viewing.idDocumentPath && !viewing.validIdPath && (
                  <a
                    href={`${API_URL.replace(/\/api$/, "")}/storage/${viewing.idDocumentPath}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-20 flex-col gap-2 text-xs font-semibold"
                  >
                    {isImageDocument(viewing.idDocumentPath) && (
                      <img src={`${API_URL.replace(/\/api$/, "")}/storage/${viewing.idDocumentPath}`} alt="Valid ID" className="h-20 w-20 rounded-xl border border-border object-cover" />
                    )}
                    <span>Valid ID</span>
                  </a>
                )}
                {viewing.validIdPath && (
                  <a
                    href={`${API_URL.replace(/\/api$/, "")}/storage/${viewing.validIdPath}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-20 flex-col gap-2 text-xs font-semibold"
                  >
                    {isImageDocument(viewing.validIdPath) && (
                      <img src={`${API_URL.replace(/\/api$/, "")}/storage/${viewing.validIdPath}`} alt="Valid ID" className="h-20 w-20 rounded-xl border border-border object-cover" />
                    )}
                    <span>Valid ID</span>
                  </a>
                )}
                {viewing.birthCertificatePath && (
                  <a
                    href={`${API_URL.replace(/\/api$/, "")}/storage/${viewing.birthCertificatePath}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-20 flex-col gap-2 text-xs font-semibold"
                  >
                    {isImageDocument(viewing.birthCertificatePath) && (
                      <img src={`${API_URL.replace(/\/api$/, "")}/storage/${viewing.birthCertificatePath}`} alt="Birth Certificate" className="h-20 w-20 rounded-xl border border-border object-cover" />
                    )}
                    <span>Birth Certificate</span>
                  </a>
                )}
                {!viewing.birthCertificatePath && (
                    <span className="rounded-xl border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
                    Birth Certificate not uploaded
                  </span>
                )}
              </div>
            </div>
          )}
          {viewing && (
            <button
              type="button"
              onClick={async () => {
                try {
                  const nameParts = viewing.name.split(" ");
                  await downloadRegistrationForm({
                    ...viewing,
                    firstName: nameParts[0] ?? "",
                    middleName: nameParts.slice(1, -1).join(" "),
                    lastName: nameParts.at(-1) ?? "",
                    status: viewing.status,
                  });
                  toast.success("Registration form downloaded.");
                } catch {
                  toast.error("Unable to download the registration form.");
                }
              }}
              className="mt-5 flex w-full items-center justify-center rounded-full bg-navy px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)]"
            >
              <Download className="mr-2 h-4 w-4" /> Download Registration Form
            </button>
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
