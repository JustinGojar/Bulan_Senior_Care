import { createFileRoute } from "@tanstack/react-router";
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
  Gift,
  Grid2X2,
  HeartHandshake,
  ListFilter,
  Loader2,
  Plus,
  MapPin,
  ShieldCheck,
  Users,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AuthAlert } from "@/components/AuthLayout";
import { SectionHeader, StatusPill } from "@/components/DesignKit";
import { IconActionButton, IconSelect } from "@/components/IconActionButton";
import {
  TONE_BAR,
  fieldClass,
  panelClass,
  primaryButtonClass,
  secondaryButtonClass,
  statCardClass,
  tileClass,
} from "@/components/design-kit";
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

const PROGRAM_ICONS = [Coins, Gift, Users, HeartHandshake, Banknote, Award];

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
              icon={<Plus className="h-5 w-5" />}
              onClick={openAddRelease}
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
      <div className={`${panelClass} mb-5 flex flex-wrap items-center gap-2 p-3 sm:p-4`}>
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
                      <StatusPill tone={program.status === "active" ? "success" : "neutral"}>
                        {program.status === "active" ? "Active" : "Inactive"}
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
                      {latestRelease ? formatDate(latestRelease.release_date) : "Not yet released"}
                    </p>
                  </div>
                </div>
                <div className="flex min-w-0 gap-2 border-l border-border/70 pl-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">Next release</p>
                    <p className="truncate text-xs font-semibold">
                      {nextRelease ? formatDate(nextRelease.release_date) : "Not scheduled"}
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
          <p className="text-sm text-muted-foreground">No benefit programs available.</p>
        )}
      </div>
      <section id="release-queue" className={`${panelClass} mt-5 overflow-hidden p-4 sm:p-6`}>
        <SectionHeader
          icon={ShieldCheck}
          title="Release queue"
          subtitle="Transactions are linked to a senior and program; one-time grants cannot be duplicated."
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
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-success/30 bg-success/10 px-3 text-xs font-bold text-success transition-colors hover:bg-success/20 disabled:opacity-40"
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
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 text-xs font-bold text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-40"
              >
                <XCircle className="h-3.5 w-3.5" /> Not received
              </button>
            </div>
          </div>
        )}
        <div className="mt-5 overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full min-w-[940px] text-sm">
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
                    <td className="px-4 py-3.5 font-semibold">{seniorName}</td>
                    <td className="px-4 py-3.5">{transaction.benefit.benefit_name}</td>
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
                        <a
                          href={`${API_URL.replace(/\/api$/, "")}/storage/${transaction.attachment_path}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block font-semibold text-primary hover:underline"
                        >
                          Open proof
                        </a>
                      )}
                    </td>
                    {canUpdateTransactions && (
                      <td className="px-4 py-3.5">
                        {transaction.status === "pending" ? (
                          <div className="flex flex-nowrap gap-2">
                            <button
                              type="button"
                              onClick={() => updateTransaction(transaction, "released")}
                              className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-lg border border-success/30 bg-success/10 px-2.5 text-xs font-bold text-success transition-colors hover:bg-success/20"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Received
                            </button>
                            <button
                              type="button"
                              onClick={() => updateTransaction(transaction, "failed")}
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
                  <td
                    colSpan={canUpdateTransactions ? 9 : 7}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No records available for the selected barangay and Expanded Centenarian program.
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
            <label>
              <span className="mb-2 block text-sm font-semibold">Expanded Centenarian</span>
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
                className={`${fieldClass} h-11`}
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
              <span className="mb-2 block text-sm font-semibold">Amount</span>
              <input
                required
                min="0"
                step="0.01"
                type="number"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                className={`${fieldClass} h-11`}
              />
            </label>
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
    </AppShell>
  );
}
