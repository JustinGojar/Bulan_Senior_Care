import { createFileRoute } from "@tanstack/react-router";
import {
  Archive,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Download,
  Eye,
  FilePenLine,
  HandCoins,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Undo2,
  Upload,
  UserRound,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useEffect } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { AuthAlert } from "@/components/AuthLayout";
import {
  EmptyState,
  RowSkeletons,
  SectionHeader,
  StatusPill,
  TableSkeletonRows,
} from "@/components/DesignKit";
import {
  fieldClass,
  panelClass,
  primaryButtonClass,
  secondaryButtonClass,
  tileClass,
} from "@/components/design-kit";
import { IconActionButton, IconSelect } from "@/components/IconActionButton";
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
import {
  API_URL,
  apiFetch,
  bulkCreateSeniors,
  getStoredUser,
  type ArchivedSenior,
  type BenefitTransaction,
  type PaginatedResponse,
} from "@/lib/api";
import { getSeniorEditRequests, reviewSeniorEditRequest, type SeniorEditRequest } from "@/lib/api";
import { loadPdfLogo } from "@/lib/pdf";
import { useSeniors, type SeniorDraft } from "@/lib/use-seniors";

export const Route = createFileRoute("/seniors")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search["q"] === "string" ? search["q"] : undefined,
    status: ["active", "pending", "inactive"].includes(String(search["status"]))
      ? (String(search["status"]) as "active" | "pending" | "inactive")
      : undefined,
  }),
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

const STATUS_TONE: Record<string, "success" | "gold" | "danger"> = {
  Active: "success",
  Pending: "gold",
  Inactive: "danger",
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

// The spreadsheet library is large, so it is only downloaded when a bulk upload starts.
type XlsxModule = typeof import("xlsx");

function normalizeBulkDate(value: unknown, XLSX: XlsxModule) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (date)
      return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
  }
  const text = String(value ?? "").trim();
  if (!text) return "";
  const monthFirst = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (monthFirst)
    return `${monthFirst[3]}-${monthFirst[1]!.padStart(2, "0")}-${monthFirst[2]!.padStart(2, "0")}`;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime())
    ? text
    : `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
}

function familyCompositionRows(value: string) {
  return value
    .split(/\r?\n|;(?=\s*[^|;]+\s*\|)/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => entry.split("|").map((cell) => cell.trim()));
}

function splitBulkName(value: unknown) {
  const parts = String(value ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] ?? "", middleName: "", lastName: "" };
  return {
    firstName: parts[0]!,
    middleName: parts.length > 2 ? parts.slice(1, -1).join(" ") : "",
    lastName: parts.at(-1)!,
  };
}

async function readBulkRecords(file: File, XLSX: XlsxModule) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]!];
  if (!sheet) return [] as Record<string, unknown>[];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  const headers = (rows[0] ?? []).map(normalizeBulkHeader);
  return rows
    .slice(1)
    .filter((row) => row.some((value) => String(value ?? "").trim()))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

async function imageDataUrl(source: File | string) {
  // A slow or stalled photo request must not hold up the registration form download.
  const response =
    typeof source === "string"
      ? await fetch(source, { signal: AbortSignal.timeout(10_000) })
      : null;
  if (response && !response.ok) throw new Error("Profile photo could not be loaded.");
  const blob = response ? await response.blob() : (source as File);
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

async function loadJsPdf() {
  try {
    return (await import("jspdf")).jsPDF;
  } catch {
    // The PDF library is a separate file that is replaced on every deploy, so a page opened
    // before the latest deploy can no longer load it.
    throw new Error(
      "The PDF tool could not be loaded. The app may have been updated; reload the page and try again.",
    );
  }
}

async function downloadRegistrationForm(draft: SeniorDraft) {
  const jsPDF = await loadJsPdf();
  const document = new jsPDF();
  const pageWidth = document.internal.pageSize.getWidth();
  const left = 18;
  const right = pageWidth - 18;

  document.setDrawColor(35, 45, 55);
  document.setLineWidth(0.4);
  document.rect(left, 12, 40, 50);
  document.setFont("helvetica", "bold");
  document.setFontSize(6.7);
  document.text("AN KAUPOD PO SANI NA", left + 3, 18);
  document.text("DOKUMENTO:", left + 3, 23);
  document.setFont("helvetica", "normal");
  [
    "1x1 PICTURE - 2pcs",
    "Birth Certificate",
    "Baptismal",
    "GSIS ID",
    "SSS ID",
    "Voter's ID",
    "National ID",
    "Brgy. ID",
    "Driver's License",
    "Passport ID",
  ].forEach((item, index) => document.text(`> ${item}`, left + 3, 28 + index * 3.35));

  document.setFont("helvetica", "bold");
  document.setFontSize(10);
  document.text("OFFICE OF THE SENIOR CITIZEN'S AFFAIRS", 112, 19, { align: "center" });
  document.setFontSize(8);
  document.text("Municipality of Bulan, Sorsogon", 112, 25, { align: "center" });
  document.setFontSize(16);
  document.setTextColor(33, 91, 125);
  document.text("REGISTRATION FORM", 112, 39, { align: "center" });
  const oscaId = draft.id;
  if (oscaId) {
    document.setFontSize(9);
    document.setTextColor(0, 0, 0);
    document.text(`OSCA ID: ${oscaId}`, 112, 46, { align: "center" });
  }
  document.setTextColor(0, 0, 0);
  document.setDrawColor(35, 45, 55);
  document.rect(166, 13, 25, 25);
  const photoSource =
    draft.profilePhoto ??
    (draft.photoPath ? `${API_URL.replace(/\/api$/, "")}/storage/${draft.photoPath}` : null);
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

  let y = 75;
  const line = (label: string, value: string, x: number, endX: number, lineY = y) => {
    document.setFont("helvetica", "bold");
    document.setFontSize(7.5);
    document.text(`${label}:`, x, lineY);
    document.setFont("helvetica", "normal");
    const startX = x + Math.max(25, document.getTextWidth(`${label}:`) + 2);
    document.line(startX, lineY + 1, endX, lineY + 1);
    if (value)
      document.text(
        document.splitTextToSize(value, Math.max(8, endX - startX - 2))[0] ?? value,
        startX + 2,
        lineY - 1,
      );
  };
  document.setFont("helvetica", "bold");
  document.setFontSize(7.5);
  document.text("NAME:", left, y);
  const nameFields = [
    { value: draft.lastName ?? "", start: 43, end: 78, label: "(Surname)" },
    { value: draft.firstName ?? "", start: 83, end: 130, label: "(First Name)" },
    { value: draft.middleName ?? "", start: 135, end: 192, label: "(Middle Name)" },
  ];
  document.setFont("helvetica", "normal");
  document.setFontSize(7);
  nameFields.forEach(({ value, start, end, label }) => {
    const center = (start + end) / 2;
    document.text(value, center, y - 1, { align: "center" });
    document.line(start, y + 1, end, y + 1);
    document.setFontSize(6.5);
    document.text(label, center, y + 5, { align: "center" });
    document.setFontSize(7);
  });
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
  [tableTop + 7, tableTop + 13, tableTop + 19, tableTop + 25].forEach((rowY) =>
    document.line(left, rowY, right, rowY),
  );
  document.setFontSize(7);
  document.text("NAME", 42, tableTop + 5, { align: "center" });
  document.text("RELATIONSHIP", 88, tableTop + 5, { align: "center" });
  document.text("AGE", 125, tableTop + 5, { align: "center" });
  document.text("STATUS", 152, tableTop + 5, { align: "center" });
  document.text("OCCUPATION", 178, tableTop + 5, { align: "center" });
  document.setFont("helvetica", "normal");
  familyCompositionRows(draft.familyComposition ?? "")
    .slice(0, 4)
    .forEach((row, rowIndex) => {
      const rowY = tableTop + 11 + rowIndex * 6;
      const columns = [left + 2, 66, 114, 141, 168];
      row.slice(0, 5).forEach((cell, columnIndex) => {
        document.text(
          document.splitTextToSize(cell, columnIndex === 0 ? 45 : columnIndex === 4 ? 25 : 24)[0] ??
            "",
          columns[columnIndex]!,
          rowY,
        );
      });
    });

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
  document.line(122, y, right, y);
  document.text("Signature of Ass. Pres. / Representative", 157, y + 5, { align: "center" });
  y += 14;
  document.setFont("helvetica", "bold");
  document.text(
    "I certify that the above information are true and correct in the best of my",
    pageWidth / 2,
    y,
    { align: "center" },
  );
  document.text("knowledge and belief.", pageWidth / 2, y + 5, { align: "center" });
  y += 25;
  document.line(125, y, right, y);
  document.setFont("helvetica", "normal");
  document.text("Signature or thumb mark of Senior Citizen", 158, y + 6, { align: "center" });
  const seniorName =
    [draft.firstName, draft.middleName, draft.lastName].filter((part) => part?.trim()).join(" ") ||
    draft.name ||
    "senior";
  const fileName = seniorName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  document.save(`osca-registration-${fileName || "senior"}.pdf`);
}

function changedFields(request: SeniorEditRequest) {
  const changes = request.changes;
  const senior = request.senior;
  const currentName = senior
    ? [senior.first_name, senior.middle_name, senior.last_name].filter(Boolean).join(" ")
    : "";
  const nextName = [changes.first_name, changes.middle_name, changes.last_name]
    .filter(Boolean)
    .join(" ");
  const currentAge = senior?.birthdate
    ? new Date().getFullYear() - Number(String(senior.birthdate).slice(0, 4))
    : null;
  const nextAge = changes.birthdate
    ? new Date().getFullYear() - Number(changes.birthdate.slice(0, 4))
    : null;
  const fields: Array<[string, string | number, string | number]> = [];
  if (senior && currentName !== nextName) fields.push(["Name", currentName, nextName]);
  if (senior && currentAge !== nextAge)
    fields.push(["Age", currentAge ?? "None", nextAge ?? "None"]);
  if (senior && (senior.contact_number ?? "") !== (changes.contact_number ?? ""))
    fields.push(["Contact", senior.contact_number || "None", changes.contact_number || "None"]);
  if (senior && senior.barangay?.barangay_name !== changes.barangay)
    fields.push(["Barangay", senior.barangay?.barangay_name || "None", changes.barangay]);
  if (senior && senior.benefits?.[0]?.benefit_name !== changes.benefit)
    fields.push(["Benefit", senior.benefits?.[0]?.benefit_name || "None", changes.benefit]);
  if (senior && (senior.address ?? "") !== (changes.address ?? ""))
    fields.push(["Address", senior.address || "None", changes.address || "None"]);
  return fields;
}

function SeniorRecords() {
  const [confirm, confirmDialog] = useConfirmDialog();
  const { q, status } = Route.useSearch();
  const currentUser = getStoredUser();
  const isHead = currentUser?.role === "head";
  const isLeader = currentUser?.role === "leader";
  const isAdmin = currentUser?.role === "admin";
  const [filter, setFilter] = useState<string>(() =>
    status ? `${status.charAt(0).toUpperCase()}${status.slice(1)}` : "All",
  );
  const [barangayFilter, setBarangayFilter] = useState("All");
  const [benefitFilter, setBenefitFilter] = useState("All");
  const [benefitOptions, setBenefitOptions] = useState<string[]>([]);
  const [query, setQuery] = useState(q ?? "");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const {
    seniors,
    totalCount,
    activeCount,
    pendingCount,
    inactiveCount,
    lastPage,
    loading,
    error,
    loadAllSeniors,
    createSenior,
    updateSenior,
    deleteSenior,
  } = useSeniors({
    page,
    perPage: 10,
    ...(filter === "All" ? {} : { status: filter.toLowerCase() }),
    search: query,
    barangay: barangayFilter === "All" ? "" : barangayFilter,
    benefit: benefitFilter === "All" ? "" : benefitFilter,
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Senior | null>(null);
  const [viewing, setViewing] = useState<Senior | null>(null);
  const [downloadingForm, setDownloadingForm] = useState(false);
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
    if (isHead)
      getSeniorEditRequests()
        .then(setEditRequests)
        .catch(() => setEditRequests([]));
  }, [isHead]);

  useEffect(() => {
    setQuery(q ?? "");
  }, [q]);

  useEffect(() => {
    apiFetch<Array<{ benefit_name: string }>>("/benefits")
      .then((benefits) => setBenefitOptions(benefits.map((benefit) => benefit.benefit_name)))
      .catch((reason: Error) => toast.error(reason.message || "Unable to load benefit options."));
  }, []);

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
      toast.success(
        status === "approved" ? "Senior record update approved." : "Senior record update declined.",
      );
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
      { key: "Inactive", count: inactiveCount },
    ],
    [totalCount, activeCount, pendingCount, inactiveCount],
  );

  const rows = seniors;

  async function openArchive() {
    setArchiveOpen(true);
    setArchiveLoading(true);
    try {
      const result = await apiFetch<{ data: ArchivedSenior[] }>("/seniors/archive");
      setArchivedRecords(
        result.data.filter((record): record is ArchivedSenior => Boolean(record?.osca_id_number)),
      );
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
    let XLSX: XlsxModule;
    try {
      XLSX = await import("xlsx");
      records = await readBulkRecords(file, XLSX);
    } catch {
      toast.error("Unable to read the file. Please upload a valid CSV or Excel file.");
      return;
    }
    if (records.length === 0) {
      toast.error("The file must contain a header row and at least one senior record.");
      return;
    }
    const normalizedRecords = records.map((record) => {
      const fullName = splitBulkName(record["name"] ?? record["full_name"]);
      const birthdate = normalizeBulkDate(
        record["birthdate"] ?? record["date_of_birth"] ?? record["dob"],
        XLSX,
      );
      const age = new Date().getFullYear() - Number(birthdate.slice(0, 4));
      const rawBenefit = String(record["benefit"] ?? "").trim();
      const benefit = /^(not provided|n\/a|na|none|-)?$/i.test(rawBenefit)
        ? age >= 100
          ? "Centenarian Award"
          : age >= 90
            ? "Nonagenarian Grant"
            : age >= 80
              ? "Octogenarian Grant"
              : "Social Pension"
        : rawBenefit;
      return {
        first_name: String(
          record["first_name"] ?? record["given_name"] ?? fullName.firstName,
        ).trim(),
        middle_name: String(record["middle_name"] ?? fullName.middleName).trim(),
        last_name: String(
          record["last_name"] ?? record["surname"] ?? record["family_name"] ?? fullName.lastName,
        ).trim(),
        birthdate,
        place_of_birth: String(record["place_of_birth"] ?? record["birthplace"] ?? "").trim(),
        sex: String(record["sex"] ?? "").toLowerCase(),
        contact_number: String(
          record["contact_number"] ??
            record["contact_numb"] ??
            record["contact"] ??
            record["phone_number"] ??
            "",
        ).trim(),
        barangay: String(record["barangay"] ?? "").trim(),
        address: String(record["address"] ?? record["complete_address"] ?? "").trim(),
        civil_status: String(record["civil_status"] ?? "").trim(),
        educational_attainment: String(record["educational_attainment"] ?? "").trim(),
        other_skills: String(record["other_skills"] ?? "").trim(),
        family_composition: String(record["family_composition"] ?? "").trim(),
        association_name: String(record["association_name"] ?? "").trim(),
        association_address: String(record["association_address"] ?? "").trim(),
        association_membership_date: normalizeBulkDate(
          record["date_of_membership"] ?? record["association_membership_date"],
          XLSX,
        ),
        association_position: String(record["association_position"] ?? "").trim(),
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
      if (failed)
        toast.error(
          `${result.created.length} records added, ${failed} failed. Row ${result.failed[0]?.row ?? "?"}: ${result.failed[0]?.message ?? "Check the uploaded data."}`,
        );
      else toast.success(`${result.created.length} senior records added and are pending review.`);
      setBulkPreview(null);
      if (result.created.length > 0) window.location.reload();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Bulk upload failed.");
    }
  }

  async function exportRecords() {
    setExporting(true);
    try {
      const exportRows = await loadAllSeniors();
      if (exportRows.length === 0) {
        toast.error("There are no senior records to export.");
        return;
      }
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
      document.text(`Records: ${exportRows.length}`, 14, 43);

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

      exportRows.forEach((senior) => {
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
    } finally {
      setExporting(false);
    }
  }

  const storageUrl = (path: string) => `${API_URL.replace(/\/api$/, "")}/storage/${path}`;
  const actionButtonClass =
    "grid h-9 w-9 place-items-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:border-ring/40 hover:text-foreground";

  return (
    <AppShell
      title="Senior Record"
      subtitle="Manage all registered senior citizens"
      breadcrumb={["Dashboard", "Senior Records"]}
      actions={
        <div className="flex gap-2 sm:gap-3">
          {(isLeader || isAdmin) && (
            <>
              <IconActionButton
                label="Register Senior"
                variant="primary"
                icon={<Plus className="h-5 w-5" />}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              />
              <IconActionButton
                label="Bulk Upload"
                icon={<Upload className="h-5 w-5" />}
                onClick={() => bulkFileInput.current?.click()}
              />
              <input
                ref={bulkFileInput}
                type="file"
                accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={handleBulkFile}
                className="hidden"
              />
            </>
          )}
          {isAdmin && (
            <IconActionButton
              label="Archive"
              icon={<Archive className="h-5 w-5" />}
              onClick={openArchive}
            />
          )}
          <IconActionButton
            label={exporting ? "Preparing export..." : "Export"}
            icon={
              exporting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Download className="h-5 w-5" />
              )
            }
            onClick={exportRecords}
            disabled={exporting}
            aria-busy={exporting}
          />
        </div>
      }
    >
      <div className="mt-5 flex flex-wrap items-center gap-2 p-3 max-sm:flex-nowrap sm:p-4 xl:flex-nowrap">
        <label className="relative min-w-0 flex-1 sm:basis-full xl:basis-0">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <span className="sr-only">Search senior records</span>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, senior ID, or barangay..."
            className={`${fieldClass} h-10 pl-10 text-xs sm:h-11 sm:text-sm`}
          />
        </label>
        <IconSelect
          label="Barangay"
          searchable
          className="!bg-white disabled:!opacity-100 sm:flex-1 xl:w-40 xl:flex-none"
          icon={<MapPin className="h-4 w-4" />}
          value={barangayFilter}
          disabled={isLeader}
          options={[
            { value: "All", label: "All Barangays" },
            ...BARANGAYS.map((barangay) => ({ value: barangay, label: barangay })),
          ]}
          onChange={(value) => {
            setBarangayFilter(value);
            setPage(1);
          }}
        />
        <IconSelect
          label="Status"
          className="sm:flex-1 xl:w-40 xl:flex-none"
          icon={<UserRound className="h-4 w-4" />}
          value={filter}
          options={filters.map((item) => ({
            value: item.key,
            label: item.key === "All" ? "All Status" : item.key,
          }))}
          onChange={(value) => {
            setFilter(value);
            setPage(1);
          }}
        />
        <IconSelect
          label="Benefit"
          className="sm:flex-1 xl:w-40 xl:flex-none"
          icon={<HandCoins className="h-4 w-4" />}
          value={benefitFilter}
          options={[
            { value: "All", label: "All Benefits" },
            ...benefitOptions.map((benefit) => ({ value: benefit, label: benefit })),
          ]}
          onChange={(value) => {
            setBenefitFilter(value);
            setPage(1);
          }}
        />
        <IconActionButton
          label="Reset"
          variant="outline"
          icon={<RotateCcw className="h-4 w-4" />}
          className="h-10 w-10 text-xs hover:translate-y-0 sm:h-11 sm:px-4"
          onClick={() => {
            setQuery("");
            setPage(1);
            setBarangayFilter(
              isLeader ? (BARANGAYS[(currentUser?.barangay_id ?? 0) - 1] ?? "All") : "All",
            );
            setFilter("All");
            setBenefitFilter("All");
          }}
        />
      </div>

      {isHead && editRequests.length > 0 && (
        <section className={`${panelClass} mt-5 p-5 sm:p-6`}>
          <SectionHeader
            icon={FilePenLine}
            title="Senior record edit requests"
            subtitle="Review changes submitted by BSCA before they update the official record."
            badge={<StatusPill tone="gold">{editRequests.length} waiting</StatusPill>}
          />
          <div className="mt-5 space-y-3">
            {editRequests.map((request) => (
              <div
                key={request.id}
                className={`${tileClass} flex flex-wrap items-center justify-between gap-4`}
              >
                <div className="min-w-0 text-sm">
                  <p className="font-bold">
                    {request.senior
                      ? [
                          request.senior.first_name,
                          request.senior.middle_name,
                          request.senior.last_name,
                        ]
                          .filter(Boolean)
                          .join(" ")
                      : [
                          request.changes?.first_name,
                          request.changes?.middle_name,
                          request.changes?.last_name,
                        ]
                          .filter(Boolean)
                          .join(" ") || "Senior record"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {request.senior?.osca_id_number ?? "Senior record"} · Requested by{" "}
                    {request.requester?.name ?? "Unknown user"}
                  </p>
                  <div className="mt-3 space-y-1.5 text-xs">
                    {changedFields(request).map(([field, current, next]) => (
                      <p key={field} className="flex flex-wrap items-center gap-1.5">
                        <span className="w-16 shrink-0 font-semibold text-foreground">{field}</span>
                        <span className="text-muted-foreground line-through">{current}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-semibold text-foreground">{next}</span>
                      </p>
                    ))}
                    {changedFields(request).length === 0 && (
                      <p className="text-muted-foreground">No changed values found.</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={reviewingRequestId === request.id}
                    onClick={() => reviewEditRequest(request, "declined")}
                    className={`${secondaryButtonClass} h-10 text-destructive`}
                  >
                    <X className="h-4 w-4" />
                    {reviewingRequestId === request.id ? "Saving..." : "Decline"}
                  </button>
                  <button
                    type="button"
                    disabled={reviewingRequestId === request.id}
                    onClick={() => reviewEditRequest(request, "approved")}
                    className={`${primaryButtonClass} h-10`}
                  >
                    <Check className="h-4 w-4" />
                    {reviewingRequestId === request.id ? "Saving..." : "Approve"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className={`${panelClass} mt-5 overflow-x-auto`}>
        <table className="w-full min-w-[880px] border-collapse text-sm [&_th]:whitespace-nowrap">
          <thead>
            <tr className="border-b border-border/60 bg-muted text-left">
              {[
                "Name",
                "Senior ID",
                "Age",
                "Barangay",
                "Contact",
                "Benefit",
                "Status",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className={`px-4 py-3.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase ${h === "Actions" ? "sticky right-0 bg-muted shadow-[-10px_0_12px_-12px_rgba(0,0,0,0.35)]" : ""}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeletonRows
                rows={6}
                columns={8}
                label="Loading senior records"
                cellClassName="px-4 py-[19px]"
              />
            ) : error ? (
              <tr>
                <td colSpan={8} className="px-5 py-12">
                  <div className="mx-auto max-w-md">
                    <AuthAlert tone="error">
                      Unable to load senior records. Please refresh and try again.
                    </AuthAlert>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((s) => (
                <tr key={s.id} className="border-t border-border/60 first:border-t-0">
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <span className="bg-navy grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full text-[11px] font-bold text-white ring-2 ring-gold/40">
                        {avatarPath(s) ? (
                          <img
                            src={storageUrl(avatarPath(s)!)}
                            alt={`${s.name} profile`}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          initials(s.name)
                        )}
                      </span>
                      <span className="font-semibold">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-muted-foreground">{s.id}</td>
                  <td className="px-4 py-3.5">{s.age}</td>
                  <td className="max-w-44 px-4 py-3.5 text-muted-foreground">{s.barangay}</td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-muted-foreground">
                    {s.contact}
                  </td>
                  <td className="max-w-40 px-4 py-3.5">{s.benefit}</td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <StatusPill tone={STATUS_TONE[s.status] ?? "neutral"}>{s.status}</StatusPill>
                  </td>
                  <td className="sticky right-0 bg-card px-4 py-3.5 shadow-[-10px_0_12px_-12px_rgba(0,0,0,0.35)]">
                    <div className="flex gap-1.5">
                      <button
                        aria-label={`View record of ${s.name}`}
                        title="View record"
                        onClick={() => setViewing(s)}
                        className={actionButtonClass}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        aria-label={`Edit record of ${s.name}`}
                        title="Edit record"
                        onClick={() => {
                          setEditing(s);
                          setFormOpen(true);
                        }}
                        className={actionButtonClass}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {isAdmin && (
                        <button
                          aria-label={`Delete record of ${s.name}`}
                          title="Delete record"
                          onClick={() => setDeleting(s)}
                          className={`${actionButtonClass} hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      {!isAdmin && (
                        <button
                          aria-label={`Archive record of ${s.name}`}
                          title="Archive record"
                          onClick={async () => {
                            const confirmed = await confirm({
                              title: "Archive this record?",
                              description: `${s.name} (${s.id}) will be moved to the archive and hidden from the active list.`,
                              confirmLabel: "Archive record",
                            });
                            if (!confirmed) return;
                            try {
                              await apiFetch(`/seniors/${encodeURIComponent(s.id)}/archive`, {
                                method: "POST",
                              });
                              toast.success(`${s.name}'s record was archived.`);
                              window.location.reload();
                            } catch (error) {
                              toast.error(
                                error instanceof Error
                                  ? error.message
                                  : "Unable to archive the record.",
                              );
                            }
                          }}
                          className={actionButtonClass}
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
            {!loading && !error && rows.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <EmptyState
                    bare
                    icon={Search}
                    title="No records match this filter"
                    description="Try a different search or reset the filters."
                    className="py-14"
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          Page <span className="font-semibold text-foreground">{page}</span> of{" "}
          <span className="font-semibold text-foreground">{lastPage}</span>
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => current - 1)}
            className={`${secondaryButtonClass} h-10 px-3 sm:px-4`}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>
          <button
            type="button"
            disabled={page >= lastPage || loading}
            onClick={() => setPage((current) => current + 1)}
            className={`${secondaryButtonClass} h-10 px-3 sm:px-4`}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <Dialog open={!!bulkPreview} onOpenChange={(open) => !open && setBulkPreview(null)}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Preview bulk import</DialogTitle>
            <DialogDescription>
              Review {bulkPreview?.length ?? 0} records before importing. Invalid rows will be
              rejected by the server.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-auto rounded-lg border border-border/60">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-muted">
                <tr className="text-[11px] tracking-wider text-muted-foreground uppercase">
                  <th className="px-3 py-2.5 font-semibold">Name</th>
                  <th className="px-3 py-2.5 font-semibold">Birthdate</th>
                  <th className="px-3 py-2.5 font-semibold">Sex</th>
                  <th className="px-3 py-2.5 font-semibold">Barangay</th>
                </tr>
              </thead>
              <tbody>
                {(bulkPreview ?? []).slice(0, 50).map((record, index) => (
                  <tr
                    key={`${record["first_name"]}-${record["last_name"]}-${index}`}
                    className="border-t border-border/60"
                  >
                    <td className="px-3 py-2 font-medium">
                      {record["first_name"]} {record["last_name"]}
                    </td>
                    <td className="px-3 py-2">{record["birthdate"]}</td>
                    <td className="px-3 py-2">
                      {record["sex"] || <span className="text-destructive">Missing</span>}
                    </td>
                    <td className="px-3 py-2">
                      {record["barangay"] || <span className="text-destructive">Missing</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setBulkPreview(null)}
              className={secondaryButtonClass}
            >
              Cancel
            </button>
            <button type="button" onClick={confirmBulkImport} className={primaryButtonClass}>
              <Upload className="h-4 w-4" />
              Import records
            </button>
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
            <div className="space-y-2">
              <RowSkeletons
                count={3}
                avatar={false}
                label="Loading archive"
                className={`${tileClass} py-3`}
              />
            </div>
          ) : archivedRecords.length === 0 ? (
            <EmptyState
              compact
              icon={Archive}
              title="No deleted records"
              description="Records an administrator deletes are kept here by OSCA ID."
            />
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {archivedRecords.map((record) => (
                <div
                  key={record.osca_id_number}
                  className={`${tileClass} flex items-center justify-between gap-4 py-3`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{record.osca_id_number}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[record["first_name"], record["last_name"]].filter(Boolean).join(" ")} ·
                      Deleted {new Date(record.deleted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => restoreRecord(record.osca_id_number)}
                    aria-label={`Restore ${record.osca_id_number}`}
                    title="Restore record"
                    className={`${secondaryButtonClass} h-9 shrink-0 px-3`}
                  >
                    <Undo2 className="h-4 w-4" />
                    Restore
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
                toast.success(
                  isLeader
                    ? "Update request sent to the Head for approval."
                    : `${draft.name}'s record was updated.`,
                );
              } else {
                const created = await createSenior(draft);
                toast.success(`${draft.name} was registered and is pending review.`);
                // The record is saved even if the form download fails; it can be downloaded later
                // from the senior's profile.
                await downloadRegistrationForm({ ...draft, id: created.id }).catch((reason) => {
                  console.error(reason);
                  toast.error(
                    reason instanceof Error && reason.message
                      ? reason.message
                      : "Unable to download the registration form.",
                  );
                });
              }
            } catch (reason) {
              toast.error(reason instanceof Error ? reason.message : "Unable to register senior.");
            }
          }}
        />
      )}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <span className="bg-navy grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full text-sm font-bold text-white ring-2 ring-gold/50">
                {viewing && avatarPath(viewing) ? (
                  <img
                    src={storageUrl(avatarPath(viewing)!)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials(viewing?.name ?? "")
                )}
              </span>
              <div className="min-w-0 text-left">
                <DialogTitle className="font-display truncate text-xl">{viewing?.name}</DialogTitle>
                <DialogDescription className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span>OSCA ID {viewing?.id}</span>
                  {viewing?.id && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                      onClick={() =>
                        navigator.clipboard
                          .writeText(viewing.id)
                          .then(() => toast.success("OSCA ID copied."))
                      }
                    >
                      <Clipboard className="h-3 w-3" /> Copy
                    </button>
                  )}
                  {viewing && (
                    <StatusPill tone={STATUS_TONE[viewing.status] ?? "neutral"}>
                      {viewing.status}
                    </StatusPill>
                  )}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["Age", viewing?.age],
              ["Barangay", viewing?.barangay],
              ["Contact", viewing?.contact],
              ["Benefit", viewing?.benefit],
            ].map(([label, value]) => (
              <div key={String(label)} className={`${tileClass} p-3`}>
                <dt className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  {label}
                </dt>
                <dd className="mt-1 font-semibold">{value || "Not provided"}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-2 border-t border-border/60 pt-5">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Registration information
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              {[
                ["Place of birth", viewing?.placeOfBirth || "Not provided"],
                ["Date of birth", viewing?.birthdate || "Not provided"],
                [
                  "Sex",
                  viewing?.sex
                    ? viewing.sex.charAt(0).toUpperCase() + viewing.sex.slice(1)
                    : "Not provided",
                ],
                ["Civil status", viewing?.civilStatus || "Not provided"],
                ["Address", viewing?.address || "Not provided"],
                ["Educational attainment", viewing?.educationalAttainment || "Not provided"],
                ["Other skills", viewing?.otherSkills || "Not provided"],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className={
                    label === "Address" ||
                    label === "Educational attainment" ||
                    label === "Other skills"
                      ? "col-span-2"
                      : ""
                  }
                >
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="mt-2 border-t border-border/60 pt-5">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Family composition
            </p>
            <p className={`${tileClass} mt-3 p-3 text-sm whitespace-pre-line`}>
              {viewing?.familyComposition || "Not provided"}
            </p>
          </div>
          <div className="mt-2 border-t border-border/60 pt-5">
            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Senior citizen association
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              {[
                ["Name of association", viewing?.associationName || "Not provided"],
                ["Address of association", viewing?.associationAddress || "Not provided"],
                ["Date of membership", viewing?.associationMembershipDate || "Not provided"],
                ["Position", viewing?.associationPosition || "Not provided"],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className={
                    label === "Name of association" || label === "Address of association"
                      ? "col-span-2"
                      : ""
                  }
                >
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
                const firstDate = first.date_distributed ?? first.created_at ?? "";
                const secondDate = second.date_distributed ?? second.created_at ?? "";
                return new Date(firstDate).getTime() - new Date(secondDate).getTime();
              });
            const latest = history.at(-1);
            return (
              <div className="mt-2 border-t border-border/60 pt-5">
                <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Benefit release history
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Latest release:{" "}
                  {latest?.date_distributed
                    ? new Date(`${latest.date_distributed}T00:00:00`).toLocaleDateString()
                    : "No release recorded"}
                </p>
                {history.length > 0 && (
                  <div className="mt-3 overflow-x-auto rounded-lg border border-border/60">
                    <table className="w-full table-fixed text-xs">
                      <thead>
                        <tr className="bg-muted/60 text-left text-[11px] tracking-wider text-muted-foreground uppercase">
                          <th className="w-[34%] px-2 py-2 font-semibold">Release period</th>
                          <th className="w-[22%] px-2 py-2 font-semibold">Actual date</th>
                          <th className="w-[20%] px-2 py-2 font-semibold">Amount</th>
                          <th className="w-[24%] px-2 py-2 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((transaction) => (
                          <tr key={transaction.id} className="border-t border-border/60">
                            <td className="truncate px-2 py-2 font-semibold">
                              {transaction.period_label ?? "-"}
                            </td>
                            <td className="truncate px-2 py-2">
                              {transaction.date_distributed
                                ? new Date(
                                    `${transaction.date_distributed}T00:00:00`,
                                  ).toLocaleDateString()
                                : "-"}
                            </td>
                            <td className="truncate px-2 py-2">
                              ₱{Number(transaction.amount).toLocaleString()}
                            </td>
                            <td className="truncate px-2 py-2 font-semibold">
                              {transaction.status === "released"
                                ? "Released"
                                : transaction.status === "failed"
                                  ? "Not received"
                                  : "Pending"}
                            </td>
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
            <div className="mt-2 border-t border-border/60 pt-5">
              <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Submitted files
              </p>
              <div className="mt-3 flex flex-wrap items-start gap-3">
                {viewing.photoPath && (
                  <a
                    href={storageUrl(viewing.photoPath)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-20 flex-col gap-2 text-xs font-semibold"
                  >
                    <img
                      src={storageUrl(viewing.photoPath)}
                      alt={`${viewing.name} profile`}
                      className="h-20 w-20 rounded-lg border border-border/60 object-cover"
                    />
                    <span>Profile photo</span>
                  </a>
                )}
                {viewing.idDocumentPath && !viewing.validIdPath && (
                  <a
                    href={storageUrl(viewing.idDocumentPath)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-20 flex-col gap-2 text-xs font-semibold"
                  >
                    {isImageDocument(viewing.idDocumentPath) && (
                      <img
                        src={storageUrl(viewing.idDocumentPath)}
                        alt="Valid ID"
                        className="h-20 w-20 rounded-lg border border-border/60 object-cover"
                      />
                    )}
                    <span>Valid ID</span>
                  </a>
                )}
                {viewing.validIdPath && (
                  <a
                    href={storageUrl(viewing.validIdPath)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-20 flex-col gap-2 text-xs font-semibold"
                  >
                    {isImageDocument(viewing.validIdPath) && (
                      <img
                        src={storageUrl(viewing.validIdPath)}
                        alt="Valid ID"
                        className="h-20 w-20 rounded-lg border border-border/60 object-cover"
                      />
                    )}
                    <span>Valid ID</span>
                  </a>
                )}
                {viewing.birthCertificatePath && (
                  <a
                    href={storageUrl(viewing.birthCertificatePath)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-20 flex-col gap-2 text-xs font-semibold"
                  >
                    {isImageDocument(viewing.birthCertificatePath) && (
                      <img
                        src={storageUrl(viewing.birthCertificatePath)}
                        alt="Birth Certificate"
                        className="h-20 w-20 rounded-lg border border-border/60 object-cover"
                      />
                    )}
                    <span>Birth Certificate</span>
                  </a>
                )}
                {!viewing.birthCertificatePath && (
                  <span className="rounded-lg border border-dashed border-border px-3 py-3 text-xs text-muted-foreground">
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
                setDownloadingForm(true);
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
                } catch (reason) {
                  console.error(reason);
                  toast.error(
                    reason instanceof Error && reason.message
                      ? reason.message
                      : "Unable to download the registration form.",
                  );
                } finally {
                  setDownloadingForm(false);
                }
              }}
              disabled={downloadingForm}
              className={`${primaryButtonClass} mt-3 h-12 w-full disabled:opacity-70`}
            >
              {downloadingForm ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Preparing Registration Form...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" /> Download Registration Form
                </>
              )}
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
              className="bg-none bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
      {confirmDialog}
    </AppShell>
  );
}
