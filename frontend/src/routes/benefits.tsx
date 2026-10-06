import { createFileRoute } from "@tanstack/react-router";
import {
  Award,
  ArrowUpDown,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Coins,
  Download,
  Gift,
  Grid2X2,
  HeartHandshake,
  ListFilter,
  Plus,
  MapPin,
  ShieldCheck,
  Users,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { IconActionButton, IconSelect } from "@/components/IconActionButton";
import {
  API_URL,
  apiFetch,
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

const PROGRAM_STYLES = [
  {
    icon: Coins,
    iconClass: "bg-sky-100 text-sky-700",
    accentClass: "border-b-sky-500",
    hoverClass: "hover:bg-sky-50 dark:hover:bg-sky-950/30",
  },
  {
    icon: Gift,
    iconClass: "bg-emerald-100 text-emerald-700",
    accentClass: "border-b-emerald-500",
    hoverClass: "hover:bg-emerald-50 dark:hover:bg-emerald-950/30",
  },
  {
    icon: Users,
    iconClass: "bg-violet-100 text-violet-700",
    accentClass: "border-b-violet-500",
    hoverClass: "hover:bg-violet-50 dark:hover:bg-violet-950/30",
  },
  {
    icon: HeartHandshake,
    iconClass: "bg-amber-100 text-amber-700",
    accentClass: "border-b-amber-500",
    hoverClass: "hover:bg-amber-50 dark:hover:bg-amber-950/30",
  },
  {
    icon: Banknote,
    iconClass: "bg-rose-100 text-rose-700",
    accentClass: "border-b-rose-500",
    hoverClass: "hover:bg-rose-50 dark:hover:bg-rose-950/30",
  },
  {
    icon: Award,
    iconClass: "bg-cyan-100 text-cyan-700",
    accentClass: "border-b-cyan-500",
    hoverClass: "hover:bg-cyan-50 dark:hover:bg-cyan-950/30",
  },
];

function BenefitTracking() {
  const [programs, setPrograms] = useState<BenefitProgram[]>([]);
  const [transactions, setTransactions] = useState<BenefitTransaction[]>([]);
  const [releaseSchedules, setReleaseSchedules] = useState<BenefitRelease[]>([]);
  const [barangays, setBarangays] = useState<Array<{ id: number; barangay_name: string }>>([]);
  const [transactionPage, setTransactionPage] = useState(1);
  const [transactionLastPage, setTransactionLastPage] = useState(1);
  const [releaseFormOpen, setReleaseFormOpen] = useState(false);
  const [selectedBenefitId, setSelectedBenefitId] = useState("");
  const [amount, setAmount] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [savingRelease, setSavingRelease] = useState(false);
  const [selectedBarangay, setSelectedBarangay] = useState("All");
  const [selectedBenefit, setSelectedBenefit] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [sortProgramsBy, setSortProgramsBy] = useState("name");
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<number[]>([]);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentUser = getStoredUser();
  const isHead = currentUser?.role === "head";
  const isLeader = currentUser?.role === "leader";
  const canManageReleases = currentUser?.role === "admin" || currentUser?.role === "head";
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
  const pendingTransactions = filteredTransactions.filter(
    (transaction) => transaction.status === "pending",
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
    apiFetch<PaginatedResponse<BenefitTransaction>>(
      `/benefit-transactions?page=${transactionPage}&per_page=25`,
    )
      .then((result) => {
        setTransactions(result.data);
        setTransactionLastPage(result.last_page);
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
  }, [currentUser?.barangay_id, isLeader, transactionPage]);

  function resetReleaseForm() {
    setSelectedBenefitId("");
    setAmount("");
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

  async function updateTransaction(transaction: BenefitTransaction, status: "released" | "failed") {
    const date =
      status === "released"
        ? window.prompt(
            "Enter the actual release date (YYYY-MM-DD):",
            transaction.date_distributed ?? "",
          )
        : null;
    if (status === "released" && !date) return;
    try {
      const updated = await saveTransactionStatus(transaction, status, date);
      setTransactions((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update benefit status.");
    }
  }

  function toggleAllPendingTransactions() {
    const pendingIds = new Set(pendingTransactions.map((transaction) => transaction.id));
    setSelectedTransactionIds((current) =>
      allPendingSelected
        ? current.filter((id) => !pendingIds.has(id))
        : [...new Set([...current, ...pendingIds])],
    );
  }

  async function updateSelectedTransactions(status: "released" | "failed") {
    const selected = filteredTransactions.filter(
      (transaction) =>
        selectedTransactionIds.includes(transaction.id) && transaction.status === "pending",
    );
    if (!selected.length) return;

    const date =
      status === "released"
        ? window.prompt(
            `Enter the actual release date (YYYY-MM-DD) for all ${selected.length} selected transactions:`,
            new Date().toISOString().slice(0, 10),
          )
        : null;
    if (status === "released" && !date) return;
    const statusLabel = status === "released" ? "Received" : "Not received";
    if (!window.confirm(`Mark ${selected.length} selected transactions as ${statusLabel}?`)) return;

    setBulkUpdating(true);
    const results = await Promise.allSettled(
      selected.map((transaction) => saveTransactionStatus(transaction, status, date)),
    );
    const updated = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );
    const updatedIds = new Set(updated.map((transaction) => transaction.id));
    setTransactions((current) =>
      current.map((transaction) =>
        updatedIds.has(transaction.id)
          ? updated.find((item) => item.id === transaction.id)!
          : transaction,
      ),
    );
    setSelectedTransactionIds((current) => current.filter((id) => !updatedIds.has(id)));
    const failedCount = results.length - updated.length;
    if (failedCount > 0)
      setError(
        `${updated.length} updated; ${failedCount} failed. Refresh and retry the remaining transactions.`,
      );
    setBulkUpdating(false);
  }

  async function saveRelease(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingRelease(true);
    try {
      const saved = await apiFetch<BenefitRelease>("/benefit-releases", {
        method: "POST",
        body: JSON.stringify({
          benefit_id: selectedBenefitId,
          amount,
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
      setReleaseFormOpen(false);
      resetReleaseForm();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save benefit release.");
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
              className="sm:h-10 sm:px-4"
              icon={<Plus className="h-5 w-5" />}
              onClick={openAddRelease}
            />
          )}
          {isHead && (
            <IconActionButton
              label="Export PDF"
              variant="outline"
              className="sm:h-10 sm:px-4"
              icon={<Download className="h-5 w-5" />}
              onClick={exportBenefits}
            />
          )}
        </div>
      }
    >
      {error && <p className="mb-4 text-sm font-medium text-destructive">{error}</p>}
      <div className="mb-5 flex flex-wrap items-center gap-2">
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
          label="Barangay"
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
          selectedStatus !== "All") && (
          <IconActionButton
            label="Clear filters"
            variant="outline"
            icon={<RotateCcw className="h-4 w-4" />}
            className="h-10 w-10 text-xs hover:translate-y-0 sm:h-11 sm:px-4"
            onClick={() => {
              if (!isLeader) setSelectedBarangay("All");
              setSelectedBenefit("All");
              setSelectedStatus("All");
            }}
          />
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
          const scheduledReleases = releaseSchedules
            .filter(
              (release) =>
                release.benefit.benefit_name === program.name && release.status === "scheduled",
            )
            .sort((a, b) => a.release_date.localeCompare(b.release_date));
          const completedReleases = releaseSchedules
            .filter(
              (release) =>
                release.benefit.benefit_name === program.name && release.status === "released",
            )
            .sort((a, b) => b.release_date.localeCompare(a.release_date));
          const nextRelease = scheduledReleases[0];
          const latestRelease = completedReleases[0];
          const {
            icon: ProgramIcon,
            iconClass,
            accentClass,
            hoverClass,
          } = PROGRAM_STYLES[index % PROGRAM_STYLES.length];
          const relatedBarangay = selectedBarangay === "All" ? "All barangays" : selectedBarangay;

          return (
            <article
              key={program.type}
              className={`surface-card flex min-h-[270px] flex-col rounded-[10px] border border-border/70 border-b-[3px] ${accentClass} ${hoverClass} cursor-pointer p-4 shadow-[0_8px_24px_rgba(23,58,82,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)] sm:p-5`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-[10px] ${iconClass}`}
                >
                  <ProgramIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-display text-base font-bold leading-tight">
                      {program.name}
                    </h2>
                    <span
                      className={`shrink-0 rounded-[10px] px-2.5 py-1 text-[10px] font-bold ${program.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-secondary text-muted-foreground"}`}
                    >
                      {program.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {program.schedule} assistance for seniors aged {program.minAge}
                    {program.maxAge ? `-${program.maxAge}` : "+"}.
                  </p>
                </div>
              </div>

              <p className="mt-3 font-display text-2xl font-extrabold text-[#173A52] dark:text-foreground">
                {program.amount}
              </p>
              <p className="text-xs text-muted-foreground">{program.schedule}</p>

              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border/70 pt-3">
                <div className="flex min-w-0 gap-2">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-navy" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">Release date</p>
                    <p className="truncate text-xs font-semibold">
                      {latestRelease ? formatDate(latestRelease.release_date) : "Not yet released"}
                    </p>
                  </div>
                </div>
                <div className="flex min-w-0 gap-2 border-l border-border/70 pl-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-navy" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">Next release</p>
                    <p className="truncate text-xs font-semibold">
                      {nextRelease ? formatDate(nextRelease.release_date) : "Not scheduled"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-[10px] bg-sky-50 px-3 py-2 dark:bg-sky-950/30">
                <p className="text-[10px] text-muted-foreground">Related to</p>
                <p className="mt-0.5 truncate text-xs font-semibold text-[#173A52] dark:text-foreground">
                  {isLeader ? `BSCA - ${relatedBarangay}` : relatedBarangay}
                </p>
              </div>

              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
                <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold">
                  <span className="rounded-[10px] bg-emerald-100 px-2 py-1 text-emerald-700">
                    Released {received}
                  </span>
                  <span className="rounded-[10px] bg-amber-100 px-2 py-1 text-amber-700">
                    Pending {pending}
                  </span>
                  {notReceived > 0 && (
                    <span className="rounded-[10px] bg-rose-100 px-2 py-1 text-rose-700">
                      Not released {notReceived}
                    </span>
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
                  className="rounded-[10px] border border-blue-300 px-3 py-1.5 text-[10px] font-bold text-blue-700 transition hover:bg-blue-50"
                >
                  View Records
                </button>
              </div>
            </article>
          );
        })}
        {!error && programs.length === 0 && (
          <p className="text-sm text-muted-foreground">No benefit programs available.</p>
        )}
      </div>
      <section
        id="release-queue"
        className="surface-card mt-5 overflow-hidden rounded-[10px] border border-border/70 p-4 sm:p-5"
      >
        <div className="flex items-center gap-3">
          <div className="bg-navy grid h-10 w-10 place-items-center rounded-[10px] text-primary-foreground">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Release queue</h2>
            <p className="text-sm text-muted-foreground">
              Transactions are linked to a senior and program; one-time grants cannot be duplicated.
            </p>
          </div>
        </div>
        {canUpdateTransactions && (
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
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
              {
                filteredTransactions.filter(
                  (transaction) =>
                    selectedTransactionIds.includes(transaction.id) &&
                    transaction.status === "pending",
                ).length
              }{" "}
              selected
            </span>
            <div className="ml-auto flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => updateSelectedTransactions("released")}
                disabled={
                  bulkUpdating ||
                  !filteredTransactions.some(
                    (transaction) =>
                      selectedTransactionIds.includes(transaction.id) &&
                      transaction.status === "pending",
                  )
                }
                className="inline-flex items-center gap-1 rounded-[10px] bg-success/15 px-3 py-2 text-xs font-bold text-success disabled:opacity-40"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Received
              </button>
              <button
                type="button"
                onClick={() => updateSelectedTransactions("failed")}
                disabled={
                  bulkUpdating ||
                  !filteredTransactions.some(
                    (transaction) =>
                      selectedTransactionIds.includes(transaction.id) &&
                      transaction.status === "pending",
                  )
                }
                className="inline-flex items-center gap-1 rounded-[10px] bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive disabled:opacity-40"
              >
                <XCircle className="h-3.5 w-3.5" /> Not received
              </button>
            </div>
          </div>
        )}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[940px] text-sm">
            <thead>
              <tr className="text-left">
                {canUpdateTransactions && <th className="px-3 py-3 font-bold">Select</th>}
                {[
                  "Senior",
                  "Program",
                  "Barangay",
                  "Source",
                  "Release date",
                  "Status",
                  "Audit",
                  ...(canUpdateTransactions ? ["Action"] : []),
                ].map((heading) => (
                  <th
                    key={heading}
                    className={`px-4 py-3 font-bold ${heading === "Action" ? "w-[190px]" : ""}`}
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
                  <tr key={transaction.id} className="border-t border-border">
                    {canUpdateTransactions && (
                      <td className="px-3 py-4">
                        {transaction.status === "pending" && (
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
                    <td className="px-4 py-4 font-semibold">{seniorName}</td>
                    <td className="px-4 py-4">{transaction.benefit.benefit_name}</td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {transaction.senior.barangay?.barangay_name ?? "Unassigned"}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {transaction.senior.encoder?.role === "leader"
                        ? `BSCA: ${transaction.senior.encoder.name}`
                        : (transaction.senior.encoder?.name ?? "Unknown")}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {transaction.date_distributed
                        ? formatDate(transaction.date_distributed)
                        : "-"}
                    </td>
                    <td
                      className={`px-4 py-4 font-bold ${transaction.status === "released" ? "text-success" : transaction.status === "failed" ? "text-destructive" : "text-gold-foreground"}`}
                    >
                      {statusLabel}
                    </td>
                    <td className="px-4 py-4 text-xs text-muted-foreground">
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
                        <a
                          href={`${API_URL.replace(/\/api$/, "")}/storage/${transaction.attachment_path}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block font-semibold text-foreground underline"
                        >
                          Open proof
                        </a>
                      )}
                    </td>
                    {canUpdateTransactions && (
                      <td className="px-4 py-4">
                        {transaction.status === "pending" ? (
                          <div className="flex flex-nowrap gap-2">
                            <button
                              type="button"
                              onClick={() => updateTransaction(transaction, "released")}
                              className="inline-flex items-center gap-1 whitespace-nowrap rounded-[10px] bg-success/15 px-2.5 py-1.5 text-xs font-bold text-success"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Received
                            </button>
                            <button
                              type="button"
                              onClick={() => updateTransaction(transaction, "failed")}
                              className="inline-flex items-center gap-1 whitespace-nowrap rounded-[10px] bg-destructive/10 px-2.5 py-1.5 text-xs font-bold text-destructive"
                            >
                              <XCircle className="h-3.5 w-3.5" /> Not received
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 rounded-[10px] px-3 py-2 text-xs font-bold ${transaction.status === "released" ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"}`}
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
                  <td
                    colSpan={canUpdateTransactions ? 9 : 7}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No records available for the selected barangay and Expanded Centenarian program.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {transactionLastPage > 1 && (
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              Page {transactionPage} of {transactionLastPage}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={transactionPage === 1}
                onClick={() => setTransactionPage((page) => page - 1)}
                className="rounded-[10px] px-4 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={transactionPage === transactionLastPage}
                onClick={() => setTransactionPage((page) => page + 1)}
                className="rounded-[10px] bg-navy px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
              >
                Next
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
            <label>
              <span className="text-xs font-semibold text-muted-foreground">
                Expanded Centenarian
              </span>
              <select
                required
                value={selectedBenefitId}
                onChange={(event) => {
                  setSelectedBenefitId(event.target.value);
                  const selected = programs.find(
                    (program) => String(program.id) === event.target.value,
                  );
                  setAmount(
                    selected?.amount === "Variable"
                      ? ""
                      : (selected?.amount.replace(/[^0-9.]/g, "") ?? ""),
                  );
                }}
                className="mt-1 w-full rounded-[10px] border border-border bg-transparent px-4 py-3 text-sm"
              >
                <option value="">Select benefit</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="text-xs font-semibold text-muted-foreground">Amount</span>
              <input
                required
                min="0"
                step="0.01"
                type="number"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                className="mt-1 w-full rounded-[10px] border border-border bg-transparent px-4 py-3 text-sm"
              />
            </label>
            <label>
              <span className="text-xs font-semibold text-muted-foreground">Release Date</span>
              <input
                required
                type="date"
                value={releaseDate}
                onChange={(event) => setReleaseDate(event.target.value)}
                className="mt-1 w-full rounded-[10px] border border-border bg-transparent px-4 py-3 text-sm"
              />
            </label>
            <label>
              <span className="text-xs font-semibold text-muted-foreground">Remarks</span>
              <input
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                placeholder="Optional remarks"
                className="mt-1 w-full rounded-[10px] border border-border bg-transparent px-4 py-3 text-sm"
              />
            </label>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button
                type="button"
                onClick={() => setReleaseFormOpen(false)}
                className="rounded-[10px] bg-secondary px-5 py-3 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingRelease}
                className="bg-navy rounded-[10px] px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {savingRelease ? "Saving..." : "Save release"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
