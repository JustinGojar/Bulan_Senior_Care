import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Award,
  ArrowUpDown,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coins,
  Download,
  FileSpreadsheet,
  Gift,
  Grid2X2,
  HeartHandshake,
  History,
  Landmark,
  ListFilter,
  Loader2,
  Plus,
  MapPin,
  ShieldCheck,
  Users,
  XCircle,
  RotateCcw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { AuthAlert } from "@/components/AuthLayout";
import { EmptyState, SectionHeader, StatusPill } from "@/components/DesignKit";
import { IconActionButton, IconSelect } from "@/components/IconActionButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TONE_BAR,
  fieldClass,
  panelClass,
  primaryButtonClass,
  secondaryButtonClass,
  statCardClass,
  tileClass,
} from "@/components/design-kit";
import { PrivateFileLink } from "@/components/PrivateFile";
import { ReleaseRosterDialog } from "@/components/ReleaseRosterDialog";
import {
  apiFetch,
  benefitProofUrl,
  getBarangays,
  getStoredUser,
  type BenefitRelease,
  type BenefitTransaction,
  type PaginatedResponse,
} from "@/lib/api";
import { loadPdfLogo } from "@/lib/pdf";
import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/benefits")({
  // `release` opens that release batch, e.g. from a release notification.
  validateSearch: (search: Record<string, unknown>): { release?: number } => {
    const release = Number(search["release"]);
    return Number.isInteger(release) && release > 0 ? { release } : {};
  },
  head: () => ({ meta: [{ title: "Benefit Tracking — Bulan SeniorCare" }] }),
  component: BenefitTracking,
});

type BenefitProgram = {
  id: number;
  name: string;
  type: string;
  minAge: number;
  maxAge?: number;
  amount: string;
  schedule: string;
  funding: string;
  status: "active" | "inactive";
};

/** Today's date as YYYY-MM-DD in the user's own time zone. */
function localToday() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

const PROGRAM_ICONS = [Coins, Gift, Users, HeartHandshake, Banknote, Award];

/** An ATM payout can only be confirmed received once the bank has credited the account. */
function awaitingBank(transaction: BenefitTransaction) {
  return transaction.payout_method === "atm" && transaction.bank_status !== "credited";
}

const BANK_STATUS_LABEL: Record<string, string> = {
  for_payroll: "ATM · For payroll",
  sent_to_bank: "ATM · Waiting for bank",
  credited: "ATM · Credited",
  crediting_failed: "ATM · Crediting failed",
};

function BenefitTracking() {
  const navigate = useNavigate();
  const [confirm, confirmDialog] = useConfirmDialog();
  const [programs, setPrograms] = useState<BenefitProgram[]>([]);
  const [transactions, setTransactions] = useState<BenefitTransaction[]>([]);
  const [releaseSchedules, setReleaseSchedules] = useState<BenefitRelease[]>([]);
  const [barangays, setBarangays] = useState<Array<{ id: number; barangay_name: string }>>([]);
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionLastPage, setTransactionLastPage] = useState(1);
  const [releaseFormOpen, setReleaseFormOpen] = useState(false);
  const [selectedBenefitId, setSelectedBenefitId] = useState("");
  const [releaseBarangayIds, setReleaseBarangayIds] = useState<number[]>([]);
  const [releaseBarangaySearch, setReleaseBarangaySearch] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [savingRelease, setSavingRelease] = useState(false);
  // The release batch whose list of receiving seniors is open.
  const [rosterReleaseId, setRosterReleaseId] = useState<number | null>(null);
  const { release: linkedReleaseId } = Route.useSearch();
  useEffect(() => {
    if (!linkedReleaseId) return;
    setRosterReleaseId(linkedReleaseId);
    // Drop it from the address so closing the batch and refreshing does not reopen it.
    void navigate({ to: "/benefits", search: {}, replace: true });
  }, [linkedReleaseId, navigate]);
  const [transactionsVersion, setTransactionsVersion] = useState(0);
  const [selectedBarangay, setSelectedBarangay] = useState("All");
  const [selectedBenefit, setSelectedBenefit] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  // The release period, e.g. "October 2026"; filtered on the server so it covers every page.
  const [selectedPeriod, setSelectedPeriod] = useState("All");
  const [periods, setPeriods] = useState<string[]>([]);
  const [sortProgramsBy, setSortProgramsBy] = useState("name");
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<number[]>([]);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [exportingQueue, setExportingQueue] = useState<"pdf" | "excel" | null>(null);
  // Transactions waiting for a release date before they are marked received.
  const [releaseDateRequest, setReleaseDateRequest] = useState<{
    transactions: BenefitTransaction[];
    date: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const currentUser = getStoredUser();
  const isHead = currentUser?.role === "head";
  const isLeader = currentUser?.role === "leader";
  // The OSCA Head schedules releases and handles ATM payrolls.
  const canManageReleases = currentUser?.role === "head";
  const canUpdateTransactions = currentUser?.role === "leader";

  function formatDate(date: string) {
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00`) : new Date(date);
    if (Number.isNaN(parsed.getTime())) return "No release date entered";
    return parsed.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const barangayOptions = useMemo(
    () => ["All", ...barangays.map((barangay) => barangay.barangay_name), "Unassigned"],
    [barangays],
  );

  const benefitOptions = useMemo(
    () => ["All", ...programs.map((program) => program.name)],
    [programs],
  );

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((transaction) => {
        const barangayMatch =
          selectedBarangay === "All" ||
          (transaction.senior.barangay?.barangay_name ?? "Unassigned") === selectedBarangay;
        const benefitMatch =
          selectedBenefit === "All" || transaction.benefit.benefit_name === selectedBenefit;
        const statusMatch = selectedStatus === "All" || transaction.status === selectedStatus;
        return barangayMatch && benefitMatch && statusMatch;
      }),
    [selectedBarangay, selectedBenefit, selectedStatus, transactions],
  );
  const sortedPrograms = useMemo(
    () =>
      [...programs].sort((a, b) => {
        if (sortProgramsBy === "amount") {
          const amountA = Number(a.amount.replace(/[^\d.]/g, "")) || 0;
          const amountB = Number(b.amount.replace(/[^\d.]/g, "")) || 0;
          return amountB - amountA;
        }
        return a.name.localeCompare(b.name);
      }),
    [programs, sortProgramsBy],
  );
  const visiblePrograms = useMemo(
    () =>
      selectedBenefit === "All"
        ? sortedPrograms
        : sortedPrograms.filter((program) => program.name === selectedBenefit),
    [selectedBenefit, sortedPrograms],
  );
  const releaseBarangayOptions = barangays.filter((barangay) =>
    barangay.barangay_name.toLowerCase().includes(releaseBarangaySearch.trim().toLowerCase()),
  );
  // A release batch covers the barangay filter when it lists it, or when it is for everyone.
  const releaseCoversBarangay = (release: BenefitRelease) =>
    selectedBarangay === "All" ||
    !release.barangays?.length ||
    release.barangays.some((barangay) => barangay.barangay_name === selectedBarangay);
  const pendingTransactions = filteredTransactions.filter(
    (transaction) => transaction.status === "pending" && !awaitingBank(transaction),
  );
  const allPendingSelected =
    pendingTransactions.length > 0 &&
    pendingTransactions.every((transaction) => selectedTransactionIds.includes(transaction.id));

  useEffect(() => {
    apiFetch<
      Array<{
        id: number;
        benefit_name: string;
        benefit_type: string;
        min_age: number;
        max_age: number | null;
        amount: string | null;
        schedule: string;
        funding_source: string;
        status: "active" | "inactive";
      }>
    >("/benefits")
      .then((benefitResult) =>
        setPrograms(
          benefitResult.map((program) => ({
            id: program.id,
            name: program.benefit_name,
            type: program.benefit_type,
            minAge: program.min_age,
            ...(program.max_age === null ? {} : { maxAge: program.max_age }),
            amount: program.amount ? `₱${Number(program.amount).toLocaleString()}` : "Variable",
            schedule:
              program.schedule === "one_time"
                ? "One-time"
                : program.schedule === "quarterly"
                  ? "Quarterly"
                  : "When funds are available",
            funding:
              program.funding_source.charAt(0).toUpperCase() + program.funding_source.slice(1),
            status: program.status,
          })),
        ),
      )
      .catch((reason: Error) => setError(reason.message));
    apiFetch<PaginatedResponse<BenefitTransaction> & { periods?: string[] }>(
      `/benefit-transactions?page=${transactionPage}&per_page=25${
        selectedPeriod === "All" ? "" : `&period=${encodeURIComponent(selectedPeriod)}`
      }`,
    )
      .then((result) => {
        setTransactions(result.data);
        setTransactionLastPage(result.last_page);
        setPeriods(result.periods ?? []);
      })
      .catch(() => setTransactions([]));
    getBarangays()
      .then((result) => {
        setBarangays(result);
        if (isLeader) {
          setSelectedBarangay(
            result.find((barangay) => barangay.id === currentUser?.barangay_id)?.barangay_name ??
              "Unassigned",
          );
        }
      })
      .catch(() => setBarangays([]));
    apiFetch<PaginatedResponse<BenefitRelease>>("/benefit-releases?page=1&per_page=50")
      .then((result) => setReleaseSchedules(result.data))
      .catch(() => setReleaseSchedules([]));
  }, [currentUser?.barangay_id, isLeader, transactionPage, transactionsVersion, selectedPeriod]);

  function resetReleaseForm() {
    setSelectedBenefitId("");
    setReleaseBarangayIds([]);
    setReleaseBarangaySearch("");
    setReleaseDate("");
    setRemarks("");
  }

  function openAddRelease() {
    resetReleaseForm();
    setReleaseFormOpen(true);
  }

  async function saveTransactionStatus(
    transaction: BenefitTransaction,
    status: "released" | "failed",
    date: string | null,
  ) {
    return apiFetch<BenefitTransaction>(`/benefit-transactions/${transaction.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status,
        amount: transaction.amount,
        period_label: transaction.period_label,
        date_distributed: date,
        remarks: transaction.remarks,
      }),
    });
  }

  async function applyTransactionStatus(
    selected: BenefitTransaction[],
    status: "released" | "failed",
    date: string | null,
  ) {
    setBulkUpdating(true);
    const results = await Promise.allSettled(
      selected.map((transaction) => saveTransactionStatus(transaction, status, date)),
    );
    setBulkUpdating(false);
    const updated = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );
    const updatedIds = new Set(updated.map((transaction) => transaction.id));
    setTransactions((current) =>
      current.map(
        (transaction) => updated.find((item) => item.id === transaction.id) ?? transaction,
      ),
    );
    setSelectedTransactionIds((current) => current.filter((id) => !updatedIds.has(id)));

    const statusLabel = status === "released" ? "received" : "not received";
    const failure = results.find((result) => result.status === "rejected");
    if (failure) {
      const reason =
        failure.reason instanceof Error
          ? failure.reason.message
          : "Unable to update benefit status.";
      toast.error(
        updated.length > 0
          ? `${updated.length} marked ${statusLabel}; ${results.length - updated.length} failed: ${reason}`
          : reason,
      );
    } else {
      toast.success(
        `${updated.length} ${updated.length === 1 ? "transaction" : "transactions"} marked ${statusLabel}.`,
      );
    }
  }

  function requestReleaseDate(selected: BenefitTransaction[]) {
    if (!selected.length) return;
    const existingDate = selected.length === 1 ? selected[0]?.date_distributed : null;
    setReleaseDateRequest({
      transactions: selected,
      date: existingDate?.slice(0, 10) || localToday(),
    });
  }

  async function confirmReleaseDate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!releaseDateRequest?.date) return;
    const { transactions: selected, date } = releaseDateRequest;
    setReleaseDateRequest(null);
    await applyTransactionStatus(selected, "released", date);
  }

  async function markNotReceived(selected: BenefitTransaction[]) {
    if (!selected.length) return;
    const confirmed = await confirm({
      title: "Mark as not received?",
      description: `${selected.length} ${selected.length === 1 ? "transaction" : "transactions"} will be marked as Not received.`,
      confirmLabel: "Mark not received",
      destructive: true,
    });
    if (confirmed) await applyTransactionStatus(selected, "failed", null);
  }

  function toggleAllPendingTransactions() {
    const pendingIds = new Set(pendingTransactions.map((transaction) => transaction.id));
    setSelectedTransactionIds((current) =>
      allPendingSelected
        ? current.filter((id) => !pendingIds.has(id))
        : [...new Set([...current, ...pendingIds])],
    );
  }

  const selectedPendingTransactions = pendingTransactions.filter((transaction) =>
    selectedTransactionIds.includes(transaction.id),
  );

  async function saveRelease(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (releaseBarangayIds.length === 0) {
      toast.error("Select at least one barangay for this release batch.");
      return;
    }
    setSavingRelease(true);
    try {
      const saved = await apiFetch<BenefitRelease>("/benefit-releases", {
        method: "POST",
        body: JSON.stringify({
          benefit_id: selectedBenefitId,
          barangay_ids: releaseBarangayIds,
          period_label: new Date(`${releaseDate}T00:00:00`).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          }),
          release_date: releaseDate,
          status: "scheduled",
          remarks,
        }),
      });
      setReleaseSchedules((current) => [saved, ...current]);
      // Show who receives on that day, and load their new records into the release queue.
      setRosterReleaseId(saved.id);
      setTransactionsVersion((version) => version + 1);
      toast.success(
        `Release saved. ${saved.transactions_count ?? 0} ${saved.transactions_count === 1 ? "senior" : "seniors"} listed for this batch.`,
      );
      setReleaseFormOpen(false);
      resetReleaseForm();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to save benefit release.");
    } finally {
      setSavingRelease(false);
    }
  }

  async function exportBenefits() {
    if (filteredTransactions.length === 0) {
      setError("There are no matching benefit records to export.");
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
      document.text("Benefit Tracking Report", 14, 28);
      document.setFontSize(9);
      document.text(`Generated: ${generatedDate.toLocaleDateString()}`, 14, 36);
      document.text(`Records: ${filteredTransactions.length}`, 14, 43);

      let y = 56;
      document.setFont("helvetica", "bold");
      document.text("Senior", 14, y);
      document.text("Program", 82, y);
      document.text("Barangay", 145, y);
      document.text("Source", 205, y);
      document.text("Status", 260, y);
      document.setFont("helvetica", "normal");
      y += 7;
      filteredTransactions.forEach((transaction) => {
        if (y > 195) {
          document.addPage();
          y = 18;
        }
        const seniorName = [
          transaction.senior.first_name,
          transaction.senior.middle_name,
          transaction.senior.last_name,
        ]
          .filter(Boolean)
          .join(" ");
        const source = transaction.senior.encoder?.name ?? "Unknown";
        const status =
          transaction.status === "released"
            ? "Received"
            : transaction.status === "failed"
              ? "Not received"
              : "Pending";
        document.text(document.splitTextToSize(seniorName, 62)[0] ?? seniorName, 14, y);
        document.text(
          document.splitTextToSize(transaction.benefit.benefit_name, 58)[0] ??
            transaction.benefit.benefit_name,
          82,
          y,
        );
        document.text(
          document.splitTextToSize(
            transaction.senior.barangay?.barangay_name ?? "Unassigned",
            54,
          )[0] ?? "Unassigned",
          145,
          y,
        );
        document.text(document.splitTextToSize(source, 48)[0] ?? source, 205, y);
        document.text(status, 260, y);
        y += 7;
      });
      document.save(`bulan-seniorcare-benefits-${generatedDate.toISOString().slice(0, 10)}.pdf`);
      setError(null);
    } catch {
      setError("Unable to export benefit records.");
    }
  }

  function matchesQueueFilters(transaction: BenefitTransaction) {
    return (
      (selectedBarangay === "All" ||
        (transaction.senior.barangay?.barangay_name ?? "Unassigned") === selectedBarangay) &&
      (selectedBenefit === "All" || transaction.benefit.benefit_name === selectedBenefit) &&
      (selectedStatus === "All" || transaction.status === selectedStatus)
    );
  }

  /** Every transaction matching the current filters, across all pages of the queue. */
  async function loadReleaseQueueReportRows() {
    const all: BenefitTransaction[] = [];
    for (let page = 1, lastPage = 1; page <= lastPage; page += 1) {
      const result = await apiFetch<PaginatedResponse<BenefitTransaction>>(
        `/benefit-transactions?page=${page}&per_page=1000`,
      );
      all.push(...result.data);
      lastPage = result.last_page;
    }
    return all.filter(matchesQueueFilters).map((transaction) => ({
      senior: [
        transaction.senior.first_name,
        transaction.senior.middle_name,
        transaction.senior.last_name,
      ]
        .filter(Boolean)
        .join(" "),
      oscaId: transaction.senior.osca_id_number,
      program: transaction.benefit.benefit_name,
      barangay: transaction.senior.barangay?.barangay_name ?? "Unassigned",
      amount: Number(transaction.amount) || 0,
      period: transaction.period_label ?? "",
      releaseDate: transaction.date_distributed ? formatDate(transaction.date_distributed) : "",
      status:
        transaction.status === "released"
          ? "Received"
          : transaction.status === "failed"
            ? "Not received"
            : "Pending",
      distributedBy: transaction.distributor?.name ?? "",
    }));
  }

  function releaseQueueFilterSummary() {
    const statusLabel =
      selectedStatus === "released"
        ? "Received"
        : selectedStatus === "failed"
          ? "Not received"
          : selectedStatus === "pending"
            ? "Pending"
            : "All statuses";
    return [
      selectedBenefit === "All" ? "All programs" : selectedBenefit,
      statusLabel,
      selectedBarangay === "All" ? "All barangays" : selectedBarangay,
    ].join(" / ");
  }

  async function exportReleaseQueue(format: "pdf" | "excel") {
    setExportingQueue(format);
    try {
      const rows = await loadReleaseQueueReportRows();
      if (rows.length === 0) {
        toast.error("There are no release queue records matching these filters.");
        return;
      }
      const generatedDate = new Date();
      const fileDate = localToday();
      const count = (status: string) => rows.filter((row) => row.status === status).length;
      const receivedAmount = rows
        .filter((row) => row.status === "Received")
        .reduce((sum, row) => sum + row.amount, 0);
      const peso = (value: number) =>
        `PHP ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const summary: Array<[string, string]> = [
        ["Filters", releaseQueueFilterSummary()],
        ["Records", String(rows.length)],
        ["Received", String(count("Received"))],
        ["Pending", String(count("Pending"))],
        ["Not received", String(count("Not received"))],
        ["Amount received", peso(receivedAmount)],
      ];

      if (format === "excel") {
        const XLSX = await import("xlsx");
        const sheet = XLSX.utils.aoa_to_sheet([
          ["Bulan SeniorCare - Release Queue Report"],
          [`Generated: ${generatedDate.toLocaleString()}`],
          ...summary,
          [],
          [
            "Senior",
            "OSCA ID",
            "Program",
            "Barangay",
            "Amount",
            "Period",
            "Release date",
            "Status",
            "Distributed by",
          ],
          ...rows.map((row) => [
            row.senior,
            row.oscaId,
            row.program,
            row.barangay,
            row.amount,
            row.period,
            row.releaseDate,
            row.status,
            row.distributedBy,
          ]),
        ]);
        sheet["!cols"] = [28, 16, 24, 20, 12, 24, 14, 14, 22].map((wch) => ({ wch }));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, sheet, "Release queue");
        XLSX.writeFile(workbook, `bulan-seniorcare-release-queue-${fileDate}.xlsx`);
      } else {
        const { jsPDF } = await import("jspdf");
        const document = new jsPDF({ orientation: "landscape" });
        const logoDataUrl = await loadPdfLogo();
        document.addImage(logoDataUrl, "PNG", 14, 7, 14, 14);
        document.setFontSize(18);
        document.text("Bulan SeniorCare", 32, 18);
        document.setFontSize(13);
        document.text("Release Queue Report", 14, 30);
        document.setFontSize(9);
        document.text(`Generated: ${generatedDate.toLocaleString()}`, 14, 37);
        summary.forEach(([label, value], index) => {
          const x = 14 + (index % 3) * 90;
          const y = 45 + Math.floor(index / 3) * 6;
          document.setFont("helvetica", "bold");
          document.text(`${label}:`, x, y);
          document.setFont("helvetica", "normal");
          document.text(value, x + 30, y);
        });

        const columns: Array<[string, number, number]> = [
          ["Senior", 14, 50],
          ["OSCA ID", 66, 28],
          ["Program", 96, 42],
          ["Barangay", 140, 34],
          ["Amount", 176, 24],
          ["Period", 202, 34],
          ["Release date", 238, 24],
          ["Status", 264, 22],
        ];
        const drawHeader = (y: number) => {
          document.setFont("helvetica", "bold");
          columns.forEach(([label, x]) => document.text(label, x, y));
          document.line(14, y + 2, 283, y + 2);
          document.setFont("helvetica", "normal");
        };
        let y = 66;
        drawHeader(y);
        y += 8;
        rows.forEach((row) => {
          if (y > 195) {
            document.addPage();
            y = 18;
            drawHeader(y);
            y += 8;
          }
          const values = [
            row.senior,
            row.oscaId,
            row.program,
            row.barangay,
            peso(row.amount),
            row.period,
            row.releaseDate || "-",
            row.status,
          ];
          columns.forEach(([, x, width], index) => {
            const value = values[index] ?? "";
            document.text(document.splitTextToSize(value, width - 2)[0] ?? value, x, y);
          });
          y += 7;
        });
        const pageCount = document.getNumberOfPages();
        for (let page = 1; page <= pageCount; page += 1) {
          document.setPage(page);
          document.setFontSize(8);
          document.text(`Page ${page} of ${pageCount}`, 283, 205, { align: "right" });
        }
        document.save(`bulan-seniorcare-release-queue-${fileDate}.pdf`);
      }
      toast.success(
        `Exported ${rows.length} release queue ${rows.length === 1 ? "record" : "records"}.`,
      );
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to export the release queue.");
    } finally {
      setExportingQueue(null);
    }
  }

  return (
    <AppShell
      title="Benefit Tracking"
      subtitle="Monitor program enrollment and releases"
      breadcrumb={["Dashboard", "Benefit Tracking"]}
      actions={
        <div className="flex items-center gap-2 sm:gap-3">
          {canManageReleases && (
            <IconActionButton
              label="Add Benefit Record"
              variant="primary"
              icon={<Plus className="h-5 w-5" />}
              onClick={openAddRelease}
            />
          )}
          <IconActionButton
            label="Release History"
            variant="outline"
            icon={<History className="h-5 w-5" />}
            onClick={() => navigate({ to: "/releases" })}
          />
          {canManageReleases && (
            <IconActionButton
              label="ATM Payroll"
              variant="outline"
              icon={<Landmark className="h-5 w-5" />}
              onClick={() => navigate({ to: "/payroll" })}
            />
          )}
          {isHead && (
            <IconActionButton
              label="Export PDF"
              variant="outline"
              icon={<Download className="h-5 w-5" />}
              onClick={exportBenefits}
            />
          )}
        </div>
      }
    >
      {error && (
        <div className="mb-4">
          <AuthAlert tone="error">{error}</AuthAlert>
        </div>
      )}
      <div className="mb-5 flex flex-wrap items-center gap-2 p-3 sm:p-4">
        <IconSelect
          label="Program"
          className="sm:flex-1 xl:w-44 xl:flex-none"
          icon={<Grid2X2 className="h-4 w-4" />}
          value={selectedBenefit}
          options={benefitOptions.map((benefit) => ({
            value: benefit,
            label: benefit === "All" ? "All Programs" : benefit,
          }))}
          onChange={setSelectedBenefit}
        />
        <IconSelect
          label="Status"
          className="sm:flex-1 xl:w-44 xl:flex-none"
          icon={<ListFilter className="h-4 w-4" />}
          value={selectedStatus}
          options={[
            { value: "All", label: "All Statuses" },
            { value: "released", label: "Released" },
            { value: "pending", label: "Pending" },
            { value: "failed", label: "Not Released" },
          ]}
          onChange={setSelectedStatus}
        />
        <IconSelect
          label="Period"
          className="sm:flex-1 xl:w-44 xl:flex-none"
          icon={<CalendarDays className="h-4 w-4" />}
          value={selectedPeriod}
          options={[
            { value: "All", label: "All Periods" },
            ...periods.map((period) => ({ value: period, label: period })),
          ]}
          onChange={(period) => {
            setSelectedPeriod(period);
            setTransactionPage(1);
          }}
        />
        <IconSelect
          label="Barangay"
          searchable
          keepWhiteBackground
          className="sm:flex-1 xl:w-44 xl:flex-none"
          icon={<MapPin className="h-4 w-4" />}
          value={selectedBarangay}
          disabled={isLeader}
          options={barangayOptions.map((barangay) => ({
            value: barangay,
            label: barangay === "All" ? "All Barangays" : barangay,
          }))}
          onChange={setSelectedBarangay}
        />
        <IconSelect
          label="Sort by"
          prefix="Sort by"
          className="sm:flex-1 xl:ml-auto xl:w-[205px] xl:flex-none"
          icon={<ArrowUpDown className="h-4 w-4" />}
          value={sortProgramsBy}
          defaultValue="name"
          options={[
            { value: "name", label: "Program name" },
            { value: "amount", label: "Amount" },
          ]}
          onChange={setSortProgramsBy}
        />
        {((!isLeader && selectedBarangay !== "All") ||
          selectedBenefit !== "All" ||
          selectedStatus !== "All" ||
          selectedPeriod !== "All") && (
          <IconActionButton
            label="Clear filters"
            variant="outline"
            icon={<RotateCcw className="h-4 w-4" />}
            className="h-10 w-10 text-xs hover:translate-y-0 sm:h-11 sm:px-4"
            onClick={() => {
              if (!isLeader) setSelectedBarangay("All");
              setSelectedBenefit("All");
              setSelectedStatus("All");
              setSelectedPeriod("All");
              setTransactionPage(1);
            }}
          />
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
        {visiblePrograms.map((program, index) => {
          const programTransactions = filteredTransactions.filter(
            (transaction) => transaction.benefit.benefit_name === program.name,
          );
          const received = programTransactions.filter(
            (transaction) => transaction.status === "released",
          ).length;
          const notReceived = programTransactions.filter(
            (transaction) => transaction.status === "failed",
          ).length;
          const pending = programTransactions.filter(
            (transaction) => transaction.status === "pending",
          ).length;
          const today = localToday();
          const programReleases = releaseSchedules.filter(
            (release) =>
              release.benefit.benefit_name === program.name &&
              release.status !== "cancelled" &&
              releaseCoversBarangay(release),
          );
          // Only batches still ahead count as next; a passed date is a past release even
          // before someone marks the batch completed.
          const nextRelease = programReleases
            .filter(
              (release) =>
                release.status === "scheduled" && release.release_date.slice(0, 10) >= today,
            )
            .sort((a, b) => a.release_date.localeCompare(b.release_date))[0];
          const latestRelease = programReleases
            .filter(
              (release) =>
                release.status === "released" || release.release_date.slice(0, 10) < today,
            )
            .sort((a, b) => b.release_date.localeCompare(a.release_date))[0];
          const ProgramIcon = PROGRAM_ICONS[index % PROGRAM_ICONS.length]!;
          const relatedBarangay = selectedBarangay === "All" ? "All barangays" : selectedBarangay;

          return (
            <article
              key={program.type}
              className={`${statCardClass} min-w-0 p-2.5 md:min-h-[270px] md:p-5`}
            >
              <span
                className={`absolute inset-x-0 top-0 h-1 ${program.status === "active" ? TONE_BAR.gold : "bg-muted-foreground/30"}`}
              />
              <div className="flex flex-col items-start gap-2 md:flex-row md:gap-3">
                <div className="bg-navy grid h-8 w-8 shrink-0 place-items-center rounded-lg text-gold md:h-11 md:w-11 dark:ring-1 dark:ring-white/20">
                  <ProgramIcon className="h-4 w-4 md:h-5 md:w-5" />
                </div>
                <div className="min-w-0 w-full flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-display text-[11px] font-bold leading-tight md:text-base">
                      {program.name}
                    </h2>
                    <span className="hidden shrink-0 md:inline-flex">
                      {/* Funding source (National, Provincial, ...); inactive programs still say so. */}
                      <StatusPill tone={program.status === "active" ? "success" : "neutral"}>
                        {program.status === "active" ? program.funding : "Inactive"}
                      </StatusPill>
                    </span>
                  </div>
                  <p className="mt-1 hidden text-xs leading-relaxed text-muted-foreground md:block">
                    {program.schedule} assistance for seniors aged {program.minAge}
                    {program.maxAge ? `-${program.maxAge}` : "+"}.
                  </p>
                </div>
              </div>

              <p className="mt-2 font-display text-sm font-extrabold md:mt-3 md:text-2xl">
                {program.amount}
              </p>
              <p className="text-[10px] text-muted-foreground md:text-xs">{program.schedule}</p>

              <div className="mt-3 hidden grid-cols-2 gap-3 border-t md:grid border-border/70 pt-3">
                <div className="flex min-w-0 gap-2">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">Release date</p>
                    <p className="truncate text-xs font-semibold">
                      {latestRelease ? (
                        <button
                          type="button"
                          onClick={() => setRosterReleaseId(latestRelease.id)}
                          className="text-primary hover:underline"
                          title="View the seniors in this batch"
                        >
                          {formatDate(latestRelease.release_date)}
                        </button>
                      ) : (
                        "Not yet released"
                      )}
                    </p>
                    {latestRelease?.status === "scheduled" && (
                      <p className="text-[10px] font-semibold text-gold-foreground dark:text-gold">
                        Not yet closed
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex min-w-0 gap-2 border-l border-border/70 pl-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">Next release</p>
                    <p className="truncate text-xs font-semibold">
                      {nextRelease ? (
                        <button
                          type="button"
                          onClick={() => setRosterReleaseId(nextRelease.id)}
                          className="text-primary hover:underline"
                          title="View the seniors in this batch"
                        >
                          {formatDate(nextRelease.release_date)}
                        </button>
                      ) : (
                        "Not scheduled"
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`${tileClass} mt-3 hidden px-3 py-2 md:block`}>
                <p className="text-[10px] text-muted-foreground">Related to</p>
                <p className="mt-0.5 truncate text-xs font-semibold">
                  {isLeader ? `BSCA - ${relatedBarangay}` : relatedBarangay}
                </p>
              </div>

              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2 md:pt-3">
                <div className="hidden flex-wrap md:flex gap-1.5 text-[10px] font-semibold">
                  <StatusPill tone="success">Released {received}</StatusPill>
                  <StatusPill tone="gold">Pending {pending}</StatusPill>
                  {notReceived > 0 && (
                    <StatusPill tone="danger">Not released {notReceived}</StatusPill>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBenefit(program.name);
                    document
                      .getElementById("release-queue")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="w-full rounded-lg border border-border bg-card px-2 py-1 text-[10px] font-bold text-foreground transition-colors hover:border-ring/40 hover:bg-muted md:w-auto md:px-3 md:py-1.5 md:text-xs"
                >
                  View Records
                </button>
              </div>
            </article>
          );
        })}
        {!error && programs.length === 0 && (
          <EmptyState
            icon={Gift}
            title="No benefit programs yet"
            description="Programs set up by the OSCA administrator will appear here."
            bare
            className={`${panelClass} col-span-3 md:col-span-2 xl:col-span-3`}
          />
        )}
      </div>
      <section id="release-queue" className={`${panelClass} mt-5 overflow-hidden p-4 sm:p-6`}>
        <SectionHeader
          icon={ShieldCheck}
          title="Release queue"
          subtitle="Transactions are linked to a senior and program; one-time grants cannot be duplicated."
          badge={
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => exportReleaseQueue("pdf")}
                disabled={exportingQueue !== null}
                className={`${secondaryButtonClass} h-9 px-3 text-xs disabled:opacity-40`}
              >
                {exportingQueue === "pdf" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Export PDF
              </button>
              <button
                type="button"
                onClick={() => exportReleaseQueue("excel")}
                disabled={exportingQueue !== null}
                className={`${secondaryButtonClass} h-9 px-3 text-xs disabled:opacity-40`}
              >
                {exportingQueue === "excel" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                )}
                Export Excel
              </button>
            </div>
          }
        />
        {canUpdateTransactions && (
          <div className={`${tileClass} mt-5 flex flex-wrap items-center gap-3 py-3`}>
            <label className="inline-flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={allPendingSelected}
                onChange={toggleAllPendingTransactions}
                disabled={pendingTransactions.length === 0 || bulkUpdating}
                className="h-4 w-4 accent-[var(--navy)]"
              />
              Select all pending on this page
            </label>
            <span className="text-xs text-muted-foreground">
              {selectedPendingTransactions.length} selected
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => requestReleaseDate(selectedPendingTransactions)}
                disabled={bulkUpdating || selectedPendingTransactions.length === 0}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-success/30 bg-success/10 px-3 text-xs font-bold text-success transition-colors hover:bg-success/20 disabled:opacity-40"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Received
              </button>
              <button
                type="button"
                onClick={() => markNotReceived(selectedPendingTransactions)}
                disabled={bulkUpdating || selectedPendingTransactions.length === 0}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 text-xs font-bold text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-40"
              >
                <XCircle className="h-3.5 w-3.5" /> Not received
              </button>
            </div>
          </div>
        )}
        <div className="mt-5 overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full min-w-[1040px] text-sm">
            <thead>
              <tr className="bg-muted text-left">
                {canUpdateTransactions && (
                  <th className="px-3 py-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Select
                  </th>
                )}
                {[
                  "Senior",
                  "Program",
                  "Period",
                  "Barangay",
                  "Source",
                  "Release date",
                  "Status",
                  "Audit",
                  ...(canUpdateTransactions ? ["Action"] : []),
                ].map((heading) => (
                  <th
                    key={heading}
                    className={`px-4 py-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase ${heading === "Action" ? "w-[190px]" : ""}`}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => {
                const seniorName = [
                  transaction.senior.first_name,
                  transaction.senior.middle_name,
                  transaction.senior.last_name,
                ]
                  .filter(Boolean)
                  .join(" ");
                const statusLabel =
                  transaction.status === "released"
                    ? "Received"
                    : transaction.status === "failed"
                      ? "Not received"
                      : "Pending";
                return (
                  <tr key={transaction.id} className="border-t border-border/60">
                    {canUpdateTransactions && (
                      <td className="px-3 py-3.5">
                        {transaction.status === "pending" && !awaitingBank(transaction) && (
                          <input
                            type="checkbox"
                            checked={selectedTransactionIds.includes(transaction.id)}
                            onChange={() =>
                              setSelectedTransactionIds((current) =>
                                current.includes(transaction.id)
                                  ? current.filter((id) => id !== transaction.id)
                                  : [...current, transaction.id],
                              )
                            }
                            disabled={bulkUpdating}
                            aria-label={`Select ${seniorName}`}
                            className="h-4 w-4 accent-[var(--navy)]"
                          />
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3.5 font-semibold">{seniorName}</td>
                    <td className="px-4 py-3.5">{transaction.benefit.benefit_name}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-muted-foreground">
                      {transaction.period_label ?? "-"}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {transaction.senior.barangay?.barangay_name ?? "Unassigned"}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {transaction.senior.encoder?.role === "leader"
                        ? `BSCA: ${transaction.senior.encoder.name}`
                        : (transaction.senior.encoder?.name ?? "Unknown")}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground">
                      {transaction.date_distributed
                        ? formatDate(transaction.date_distributed)
                        : "-"}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <StatusPill
                        tone={
                          transaction.status === "released"
                            ? "success"
                            : transaction.status === "failed"
                              ? "danger"
                              : "gold"
                        }
                      >
                        {statusLabel}
                      </StatusPill>
                      {transaction.bank_status && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {BANK_STATUS_LABEL[transaction.bank_status]}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      <p>
                        Created by{" "}
                        {transaction.creator?.name ?? transaction.distributor?.name ?? "Unknown"}
                      </p>
                      {transaction.created_at && (
                        <p>{new Date(transaction.created_at).toLocaleString()}</p>
                      )}
                      {transaction.updater && (
                        <p className="mt-1">Modified by {transaction.updater.name}</p>
                      )}
                      {transaction.attachment_path && (
                        <PrivateFileLink
                          path={benefitProofUrl(transaction.id, transaction.attachment_path)}
                          className="mt-1 inline-block font-semibold text-primary hover:underline"
                        >
                          Open proof
                        </PrivateFileLink>
                      )}
                    </td>
                    {canUpdateTransactions && (
                      <td className="px-4 py-3.5">
                        {transaction.status === "pending" && awaitingBank(transaction) ? (
                          <span className="text-xs font-semibold text-muted-foreground">
                            Waiting for bank
                          </span>
                        ) : transaction.status === "pending" ? (
                          <div className="flex flex-nowrap gap-2">
                            <button
                              type="button"
                              onClick={() => requestReleaseDate([transaction])}
                              className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-lg border border-success/30 bg-success/10 px-2.5 text-xs font-bold text-success transition-colors hover:bg-success/20"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Received
                            </button>
                            <button
                              type="button"
                              onClick={() => markNotReceived([transaction])}
                              className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 text-xs font-bold text-destructive transition-colors hover:bg-destructive/20"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Not received
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-bold ${transaction.status === "released" ? "text-success" : "text-destructive"}`}
                          >
                            {transaction.status === "released" ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5" />
                            )}
                            {transaction.status === "released" ? "Received" : "Not received"}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={canUpdateTransactions ? 10 : 8}>
                    <EmptyState
                      bare
                      icon={Search}
                      title="No release records"
                      description="Nothing matches the selected barangay, benefit and status."
                      className="py-12"
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {transactionLastPage > 1 && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Page <span className="font-semibold text-foreground">{transactionPage}</span> of{" "}
              <span className="font-semibold text-foreground">{transactionLastPage}</span>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={transactionPage === 1}
                onClick={() => setTransactionPage((page) => page - 1)}
                className={`${secondaryButtonClass} h-10 px-3 sm:px-4`}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <button
                type="button"
                disabled={transactionPage === transactionLastPage}
                onClick={() => setTransactionPage((page) => page + 1)}
                className={`${secondaryButtonClass} h-10 px-3 sm:px-4`}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>
      <Dialog
        open={releaseFormOpen}
        onOpenChange={(open) => {
          setReleaseFormOpen(open);
          if (!open) resetReleaseForm();
        }}
      >
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Add Release</DialogTitle>
            <DialogDescription>
              Enter the actual release details. The release date is never assigned automatically.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveRelease} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="release-benefit" className="mb-2 block text-sm font-semibold">
                Expanded Centenarian
              </label>
              <Select
                name="benefit_id"
                required
                value={selectedBenefitId}
                onValueChange={setSelectedBenefitId}
              >
                <SelectTrigger id="release-benefit">
                  <SelectValue placeholder="Select benefit" />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((program) => (
                    <SelectItem key={program.id} value={String(program.id)}>
                      {program.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label>
              <span className="mb-2 block text-sm font-semibold">Release Date</span>
              <input
                required
                type="date"
                value={releaseDate}
                onChange={(event) => setReleaseDate(event.target.value)}
                className={`${fieldClass} h-11`}
              />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold">Remarks</span>
              <input
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                placeholder="Optional remarks"
                className={`${fieldClass} h-11`}
              />
            </label>
            <fieldset className="sm:col-span-2">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <legend className="text-sm font-semibold">
                  Barangays in this batch{" "}
                  <span className="font-normal text-muted-foreground">
                    ({releaseBarangayIds.length} selected)
                  </span>
                </legend>
                <div className="flex gap-3 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() =>
                      setReleaseBarangayIds([
                        ...new Set([
                          ...releaseBarangayIds,
                          ...releaseBarangayOptions.map((barangay) => barangay.id),
                        ]),
                      ])
                    }
                    className="text-primary hover:underline"
                  >
                    Select all{releaseBarangaySearch ? " shown" : ""}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReleaseBarangayIds([])}
                    className="text-muted-foreground hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <input
                type="search"
                value={releaseBarangaySearch}
                onChange={(event) => setReleaseBarangaySearch(event.target.value)}
                placeholder="Search barangay"
                className={`${fieldClass} h-10`}
              />
              <div className="mt-2 grid max-h-56 gap-1 overflow-y-auto rounded-lg border border-border/60 p-2 sm:grid-cols-2">
                {releaseBarangayOptions.map((barangay) => (
                  <label
                    key={barangay.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={releaseBarangayIds.includes(barangay.id)}
                      onChange={(event) =>
                        setReleaseBarangayIds((current) =>
                          event.target.checked
                            ? [...current, barangay.id]
                            : current.filter((id) => id !== barangay.id),
                        )
                      }
                      className="h-4 w-4 shrink-0 accent-[var(--navy)]"
                    />
                    {barangay.barangay_name}
                  </label>
                ))}
                {releaseBarangayOptions.length === 0 && (
                  <p className="px-2 py-3 text-sm text-muted-foreground">No barangay matches.</p>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Only the BSCA Presidents and seniors of these barangays are notified. Schedule the
                other barangays as separate batches.
              </p>
            </fieldset>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button
                type="button"
                onClick={() => setReleaseFormOpen(false)}
                className={secondaryButtonClass}
              >
                Cancel
              </button>
              <button type="submit" disabled={savingRelease} className={primaryButtonClass}>
                {savingRelease && <Loader2 className="h-4 w-4 animate-spin" />}
                {savingRelease ? "Saving..." : "Save release"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={releaseDateRequest !== null}
        onOpenChange={(open) => !open && setReleaseDateRequest(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Mark as received</DialogTitle>
            <DialogDescription>
              Enter the actual release date for{" "}
              {releaseDateRequest?.transactions.length === 1
                ? "this transaction"
                : `all ${releaseDateRequest?.transactions.length} selected transactions`}
              .
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={confirmReleaseDate} className="space-y-5">
            <label className="block text-sm font-semibold">
              Release date
              <input
                type="date"
                required
                value={releaseDateRequest?.date ?? ""}
                max={localToday()}
                onChange={(event) =>
                  setReleaseDateRequest((current) =>
                    current ? { ...current, date: event.target.value } : current,
                  )
                }
                className={`${fieldClass} mt-2 h-11`}
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setReleaseDateRequest(null)}
                className={`${secondaryButtonClass} h-10 px-4`}
              >
                Cancel
              </button>
              <button type="submit" className={`${primaryButtonClass} h-10 px-4`}>
                <CheckCircle2 className="h-4 w-4" /> Mark received
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {confirmDialog}
      <ReleaseRosterDialog
        releaseId={rosterReleaseId}
        onClose={() => setRosterReleaseId(null)}
        onChanged={() => setTransactionsVersion((version) => version + 1)}
      />
    </AppShell>
  );
}
