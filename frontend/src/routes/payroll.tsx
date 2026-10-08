import { createFileRoute } from "@tanstack/react-router";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Download,
  FileUp,
  Landmark,
  Loader2,
  Plus,
  Send,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { AuthAlert } from "@/components/AuthLayout";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState, SectionHeader, StatusPill, TileSkeletons } from "@/components/DesignKit";
import { IconActionButton } from "@/components/IconActionButton";
import { PrivateFileLink } from "@/components/PrivateFile";
import {
  badgeClass,
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
  createPayrollBatch,
  deletePayrollBatch,
  getPayrollBatch,
  getPayrollBatches,
  getStoredUser,
  importAtmAccounts,
  markPayrollSent,
  payrollReportUrl,
  recordPayrollCrediting,
  setPayrollItemResult,
  type BankStatus,
  type PayrollBatch,
  type PayrollBatchSummary,
  type PayrollItem,
  type PayrollRowResult,
} from "@/lib/api";

export const Route = createFileRoute("/payroll")({
  head: () => ({ meta: [{ title: "ATM Payroll — Bulan SeniorCare" }] }),
  component: PayrollPage,
});

const BATCH_STATUS: Record<
  PayrollBatchSummary["status"],
  { label: string; tone: "gold" | "neutral" | "success" }
> = {
  draft: { label: "Draft", tone: "neutral" },
  sent_to_bank: { label: "Sent to bank", tone: "gold" },
  reconciled: { label: "Reconciled", tone: "success" },
};

const BANK_STATUS: Record<
  BankStatus,
  { label: string; tone: "gold" | "neutral" | "success" | "danger" }
> = {
  for_payroll: { label: "For payroll", tone: "neutral" },
  sent_to_bank: { label: "Waiting for bank", tone: "gold" },
  credited: { label: "Credited", tone: "success" },
  crediting_failed: { label: "Crediting failed", tone: "danger" },
};

function localToday() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function peso(value: string | number | null | undefined) {
  return `₱${Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function seniorName(item: PayrollItem) {
  const senior = item.senior;
  if (!senior) return "Deleted record";
  return [senior.last_name + ",", senior.first_name, senior.middle_name].filter(Boolean).join(" ");
}

/** Reads the first sheet of a CSV or Excel file into rows keyed by snake_case header. */
async function readSheet(file: File) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]!];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  const headers = (rows[0] ?? []).map((header) =>
    String(header ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, ""),
  );
  return rows
    .slice(1)
    .filter((row) => row.some((value) => String(value ?? "").trim()))
    .map((row) =>
      Object.fromEntries(headers.map((header, index) => [header, String(row[index] ?? "").trim()])),
    );
}

/** The first non-empty value among a row's columns that go by different names. */
function pick(row: Record<string, string>, names: string[]) {
  for (const name of names) if (row[name]) return row[name];
  return "";
}

const OSCA_ID_COLUMNS = [
  "osca_id",
  "osca_id_number",
  "osca_id_no",
  "osca_no",
  "senior_citizen_id",
  "id_number",
];

/** Banks word the result differently; anything that reads as unsuccessful counts as failed. */
function isCredited(result: string) {
  const text = result.toLowerCase();
  if (/(fail|unsuccess|reject|not|error|closed|invalid|return)/.test(text)) return false;
  return /(credit|success|paid|posted|ok|done|yes)/.test(text);
}

function PayrollPage() {
  const user = getStoredUser();
  // ATM payrolls are handled by the OSCA Head.
  const canManage = user?.role === "head";
  const canView = canManage;
  const [confirm, confirmDialog] = useConfirmDialog();
  const [batches, setBatches] = useState<PayrollBatchSummary[]>([]);
  const [selected, setSelected] = useState<PayrollBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [unmatched, setUnmatched] = useState<{ title: string; rows: PayrollRowResult[] } | null>(
    null,
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [sentOpen, setSentOpen] = useState(false);
  const [creditingOpen, setCreditingOpen] = useState(false);
  const [failingItem, setFailingItem] = useState<PayrollItem | null>(null);
  const accountsInput = useRef<HTMLInputElement>(null);

  const loadBatches = useCallback(() => {
    return getPayrollBatches()
      .then((result) => {
        setBatches(result);
        setError(null);
        return result;
      })
      .catch((reason: Error) => {
        setError(reason.message);
        return [] as PayrollBatchSummary[];
      });
  }, []);

  const openBatch = useCallback((id: number) => {
    setLoadingBatch(true);
    setUnmatched(null);
    getPayrollBatch(id)
      .then(setSelected)
      .catch((reason: Error) => toast.error(reason.message))
      .finally(() => setLoadingBatch(false));
  }, []);

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    loadBatches()
      .then((result) => {
        if (result[0]) openBatch(result[0].id);
      })
      .finally(() => setLoading(false));
  }, [canView, loadBatches, openBatch]);

  function batchUpdated(batch: PayrollBatch) {
    setSelected(batch);
    void loadBatches();
  }

  async function importAccounts(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const accounts = (await readSheet(file))
        .map((row) => ({
          osca_id_number: pick(row, OSCA_ID_COLUMNS),
          account_last4: pick(row, [
            "account_last4",
            "account_last_4",
            "last_4_digits",
            "account_number",
            "account_no",
            "atm_account",
            "atm_account_number",
          ])
            .replace(/\D/g, "")
            .slice(-4),
        }))
        .filter((row) => row.osca_id_number);
      if (!accounts.length) {
        toast.error(
          "No rows found. The sheet needs an OSCA ID column and an account number column.",
        );
        return;
      }
      const result = await importAtmAccounts(accounts);
      toast.success(
        `ATM accounts saved for ${result.updated} ${result.updated === 1 ? "senior" : "seniors"}.`,
      );
      setUnmatched(
        result.unmatched.length
          ? { title: "ATM account rows not saved", rows: result.unmatched }
          : null,
      );
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to import ATM accounts.");
    } finally {
      setBusy(false);
    }
  }

  async function exportPayroll(batch: PayrollBatch) {
    const XLSX = await import("xlsx");
    const rows = batch.transactions.map((item, index) => ({
      "No.": index + 1,
      "OSCA ID": item.senior?.osca_id_number ?? "",
      "Last Name": item.senior?.last_name ?? "",
      "First Name": item.senior?.first_name ?? "",
      "Middle Name": item.senior?.middle_name ?? "",
      Barangay: item.senior?.barangay?.barangay_name ?? "",
      "Account (last 4)": item.senior?.atm_account_last4 ?? "",
      Amount: Number(item.amount),
      // Filled in from the bank's crediting report, then imported back.
      Result: "",
      Reason: "",
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Payroll");
    XLSX.writeFile(
      workbook,
      `${batch.batch_number}-${batch.period_label.replace(/\s+/g, "-")}.xlsx`,
    );
  }

  async function removeBatch(batch: PayrollBatch) {
    const ok = await confirm({
      title: `Delete ${batch.batch_number}?`,
      description:
        "This draft payroll and its listed seniors will be removed. Nothing has been sent to the bank yet.",
      confirmLabel: "Delete payroll",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deletePayrollBatch(batch.id);
      toast.success(`${batch.batch_number} deleted.`);
      setSelected(null);
      const result = await loadBatches();
      if (result[0]) openBatch(result[0].id);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to delete payroll.");
    }
  }

  async function markCredited(item: PayrollItem) {
    if (!selected) return;
    try {
      batchUpdated(await setPayrollItemResult(selected.id, item.id, { credited: true }));
      toast.success(`${seniorName(item)} marked credited.`);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Unable to update.");
    }
  }

  const counts = selected
    ? {
        total: selected.transactions.length,
        amount: selected.transactions.reduce((sum, item) => sum + Number(item.amount), 0),
        credited: selected.transactions.filter((item) => item.bank_status === "credited").length,
        failed: selected.transactions.filter((item) => item.bank_status === "crediting_failed")
          .length,
        waiting: selected.transactions.filter((item) => item.bank_status === "sent_to_bank").length,
        received: selected.transactions.filter((item) => item.status === "released").length,
      }
    : null;

  return (
    <AppShell
      title="ATM Payroll"
      subtitle="Track ATM payouts from payroll to the bank's crediting report"
      breadcrumb={["Dashboard", "Benefit Tracking", "ATM Payroll"]}
      actions={
        canManage && (
          <div className="flex items-center gap-2 sm:gap-3">
            <IconActionButton
              label="New Payroll"
              variant="primary"
              icon={<Plus className="h-5 w-5" />}
              onClick={() => setCreateOpen(true)}
            />
            <IconActionButton
              label="Import ATM Accounts"
              icon={
                busy ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CreditCard className="h-5 w-5" />
                )
              }
              onClick={() => accountsInput.current?.click()}
            />
            <input
              ref={accountsInput}
              type="file"
              accept=".csv,.xls,.xlsx"
              onChange={importAccounts}
              className="hidden"
            />
          </div>
        )
      }
    >
      {confirmDialog}
      {!canView && <AuthAlert tone="error">Only the Head account can open ATM payrolls.</AuthAlert>}
      {error && (
        <div className="mb-4">
          <AuthAlert tone="error">{error}</AuthAlert>
        </div>
      )}
      {unmatched && (
        <div className="mb-4 rounded-lg border border-gold/40 bg-gold/10 p-4 text-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="font-bold">
              {unmatched.title} ({unmatched.rows.length})
            </p>
            <button
              type="button"
              onClick={() => setUnmatched(null)}
              className="text-xs font-semibold text-primary"
            >
              Dismiss
            </button>
          </div>
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-muted-foreground">
            {unmatched.rows.map((row) => (
              <li key={`${row.row}-${row.osca_id_number}`}>
                Row {row.row}:{" "}
                <span className="font-semibold text-foreground">{row.osca_id_number}</span> —{" "}
                {row.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {canView && (
        <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
          <section className={`${panelClass} p-4 sm:p-5`}>
            <SectionHeader icon={Landmark} title="Payrolls" subtitle="Newest first." />
            <div className="mt-4 space-y-2">
              {loading && <TileSkeletons count={3} label="Loading payrolls" />}
              {!loading && batches.length === 0 && (
                <EmptyState
                  compact
                  icon={Landmark}
                  title="No ATM payrolls yet"
                  description={
                    canManage
                      ? "Import the bank's ATM enrollment list, then create a payroll."
                      : "Payrolls appear here once OSCA creates them."
                  }
                />
              )}
              {batches.map((batch) => {
                const status = BATCH_STATUS[batch.status];
                const active = selected?.id === batch.id;
                return (
                  <button
                    key={batch.id}
                    type="button"
                    onClick={() => openBatch(batch.id)}
                    className={`${tileClass} w-full text-left transition-colors ${active ? "border-ring/60 bg-primary/5" : "hover:bg-muted/60"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold">{batch.batch_number}</span>
                      <StatusPill tone={status.tone}>{status.label}</StatusPill>
                    </div>
                    <p className="mt-1 text-sm">
                      {batch.benefit.benefit_name} · {batch.period_label}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {batch.transactions_count ?? 0} seniors · {peso(batch.total_amount)} ·{" "}
                      {batch.credited_count ?? 0} credited · {batch.received_count ?? 0} received
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className={`${panelClass} min-w-0 p-4 sm:p-6`}>
            {loadingBatch && !selected && <TileSkeletons count={4} label="Loading payroll" />}
            {!loadingBatch && !selected && !loading && (
              <EmptyState
                icon={Banknote}
                title="Select a payroll"
                description="Its seniors and bank results appear here."
              />
            )}
            {selected && counts && (
              <>
                <SectionHeader
                  icon={Banknote}
                  title={`${selected.batch_number} · ${selected.benefit.benefit_name}`}
                  subtitle={`${selected.period_label}${selected.bank_reference ? ` · Bank ref. ${selected.bank_reference}` : ""}${selected.sent_at ? ` · Sent ${new Date(`${selected.sent_at.slice(0, 10)}T00:00:00`).toLocaleDateString()}` : ""}`}
                  badge={
                    <span className={`${badgeClass} inline-flex items-center gap-1.5`}>
                      {loadingBatch && <Loader2 className="h-3 w-3 animate-spin" />}
                      {BATCH_STATUS[selected.status].label}
                    </span>
                  }
                />

                <ol className="mt-5 grid gap-2 text-xs sm:grid-cols-3">
                  {[
                    ["1. Payroll prepared", true],
                    ["2. Sent to bank", selected.status !== "draft"],
                    ["3. Crediting report recorded", selected.status === "reconciled"],
                  ].map(([label, done]) => (
                    <li
                      key={String(label)}
                      className={`rounded-lg border px-3 py-2 font-semibold ${done ? "border-success/30 bg-success/10 text-success" : "border-border/60 text-muted-foreground"}`}
                    >
                      {label}
                    </li>
                  ))}
                </ol>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {[
                    ["Seniors", counts.total],
                    ["Total amount", peso(counts.amount)],
                    ["Waiting for bank", counts.waiting],
                    ["Credited", counts.credited],
                    ["Crediting failed", counts.failed],
                    ["Confirmed received", counts.received],
                  ].map(([label, value]) => (
                    <div key={String(label)} className={tileClass}>
                      <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                        {label}
                      </p>
                      <p className="mt-1 text-lg font-bold">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => exportPayroll(selected)}
                    className={secondaryButtonClass}
                  >
                    <Download className="h-4 w-4" /> Export payroll
                  </button>
                  {canManage && selected.status === "draft" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSentOpen(true)}
                        className={primaryButtonClass}
                      >
                        <Send className="h-4 w-4" /> Mark as sent to bank
                      </button>
                      <button
                        type="button"
                        onClick={() => removeBatch(selected)}
                        className={`${secondaryButtonClass} text-destructive`}
                      >
                        <Trash2 className="h-4 w-4" /> Delete draft
                      </button>
                    </>
                  )}
                  {canManage && selected.status !== "draft" && (
                    <button
                      type="button"
                      onClick={() => setCreditingOpen(true)}
                      className={primaryButtonClass}
                    >
                      <FileUp className="h-4 w-4" /> Record crediting report
                    </button>
                  )}
                  {selected.crediting_report_path && (
                    <PrivateFileLink
                      path={payrollReportUrl(selected.id, selected.crediting_report_path)}
                      className={secondaryButtonClass}
                    >
                      Open bank report
                    </PrivateFileLink>
                  )}
                </div>

                <div className="mt-5 overflow-x-auto rounded-lg border border-border/60">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        {[
                          "OSCA ID",
                          "Senior",
                          "Barangay",
                          "Account",
                          "Amount",
                          "Bank",
                          "Received",
                          ...(canManage && selected.status !== "draft" ? ["Action"] : []),
                        ].map((heading) => (
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
                      {selected.transactions.map((item) => {
                        const bank = item.bank_status ? BANK_STATUS[item.bank_status] : null;
                        return (
                          <tr key={item.id} className="border-t border-border/60">
                            <td className="px-3 py-3 font-mono text-xs">
                              {item.senior?.osca_id_number ?? "-"}
                            </td>
                            <td className="px-3 py-3 font-semibold">{seniorName(item)}</td>
                            <td className="px-3 py-3 text-muted-foreground">
                              {item.senior?.barangay?.barangay_name ?? "-"}
                            </td>
                            <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                              {item.senior?.atm_account_last4
                                ? `•••• ${item.senior.atm_account_last4}`
                                : "-"}
                            </td>
                            <td className="px-3 py-3">{peso(item.amount)}</td>
                            <td className="px-3 py-3">
                              {bank && <StatusPill tone={bank.tone}>{bank.label}</StatusPill>}
                              {item.bank_remarks && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {item.bank_remarks}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              {item.status === "released" ? (
                                <StatusPill tone="success">Received</StatusPill>
                              ) : item.status === "failed" ? (
                                <StatusPill tone="danger">Not received</StatusPill>
                              ) : (
                                <StatusPill tone="neutral">Not yet</StatusPill>
                              )}
                            </td>
                            {canManage && selected.status !== "draft" && (
                              <td className="px-3 py-3">
                                {item.status !== "released" && (
                                  <div className="flex flex-nowrap gap-1.5">
                                    {item.bank_status !== "credited" && (
                                      <button
                                        type="button"
                                        onClick={() => markCredited(item)}
                                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-success/30 bg-success/10 px-2.5 text-xs font-bold whitespace-nowrap text-success hover:bg-success/20"
                                      >
                                        <CheckCircle2 className="h-3.5 w-3.5" /> Credited
                                      </button>
                                    )}
                                    {item.bank_status !== "crediting_failed" && (
                                      <button
                                        type="button"
                                        onClick={() => setFailingItem(item)}
                                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 text-xs font-bold whitespace-nowrap text-destructive hover:bg-destructive/20"
                                      >
                                        <XCircle className="h-3.5 w-3.5" /> Failed
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Credited means the bank put the money in the account. The senior's BSCA President
                  then confirms they received it on the Benefit Tracking page.
                </p>
              </>
            )}
          </section>
        </div>
      )}

      <CreatePayrollDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(batch) => {
          batchUpdated(batch);
          toast.success(`${batch.batch_number} created with ${batch.transactions.length} seniors.`);
        }}
      />
      {selected && (
        <>
          <MarkSentDialog
            open={sentOpen}
            onOpenChange={setSentOpen}
            batch={selected}
            onSaved={(batch) => {
              batchUpdated(batch);
              toast.success(`${batch.batch_number} marked as sent to the bank.`);
            }}
          />
          <CreditingDialog
            open={creditingOpen}
            onOpenChange={setCreditingOpen}
            batch={selected}
            onSaved={(result) => {
              batchUpdated(result.batch);
              toast.success(`${result.credited} credited and ${result.failed} failed recorded.`);
              setUnmatched(
                result.unmatched.length
                  ? { title: "Report rows not matched to this payroll", rows: result.unmatched }
                  : null,
              );
            }}
          />
          <FailItemDialog
            item={failingItem}
            onClose={() => setFailingItem(null)}
            onSave={async (reason) => {
              if (!failingItem) return;
              batchUpdated(
                await setPayrollItemResult(selected.id, failingItem.id, {
                  credited: false,
                  reason,
                }),
              );
              toast.success(`${seniorName(failingItem)} marked as crediting failed.`);
              setFailingItem(null);
            }}
          />
        </>
      )}
    </AppShell>
  );
}

function CreatePayrollDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (batch: PayrollBatch) => void;
}) {
  const [benefits, setBenefits] = useState<
    Array<{ id: number; benefit_name: string; amount: string | null; status: string }>
  >([]);
  const [benefitId, setBenefitId] = useState("");
  const [period, setPeriod] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    apiFetch<Array<{ id: number; benefit_name: string; amount: string | null; status: string }>>(
      "/benefits",
    )
      .then((result) => setBenefits(result.filter((benefit) => benefit.status === "active")))
      .catch((reason: Error) => setError(reason.message));
  }, [open]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const batch = await createPayrollBatch({
        benefit_id: Number(benefitId),
        period_label: period.trim(),
      });
      onCreated(batch);
      onOpenChange(false);
      setPeriod("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create payroll.");
    } finally {
      setSaving(false);
    }
  }

  const benefit = benefits.find((item) => String(item.id) === benefitId);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>New ATM payroll</DialogTitle>
            <DialogDescription>
              Lists every active senior on this benefit who has an ATM account on file and is not
              yet paid for the period.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {error && <AuthAlert tone="error">{error}</AuthAlert>}
            <label className="block text-sm font-semibold">
              Benefit
              <select
                required
                value={benefitId}
                onChange={(event) => setBenefitId(event.target.value)}
                className={`${fieldClass} mt-2 h-11`}
              >
                <option value="">Select a benefit</option>
                {benefits.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.benefit_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Period
              <input
                required
                maxLength={100}
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                placeholder="e.g. Q1 2027"
                className={`${fieldClass} mt-2 h-11`}
              />
            </label>
            <label className="block text-sm font-semibold">
              Amount per senior
              {/* Set by the benefit program; a payroll cannot pay a different amount. */}
              <input
                readOnly
                tabIndex={-1}
                value={benefit ? peso(benefit.amount) : ""}
                placeholder="Select a benefit"
                className={`${fieldClass} mt-2 h-11 cursor-default bg-muted/60 text-muted-foreground`}
              />
            </label>
          </div>
          <DialogFooter className="mt-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className={secondaryButtonClass}
            >
              Cancel
            </button>
            <button type="submit" disabled={saving} className={primaryButtonClass}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Create payroll
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MarkSentDialog({
  open,
  onOpenChange,
  batch,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: PayrollBatch;
  onSaved: (batch: PayrollBatch) => void;
}) {
  const [sentAt, setSentAt] = useState(localToday);
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      onSaved(
        await markPayrollSent(batch.id, { sent_at: sentAt, bank_reference: reference.trim() }),
      );
      onOpenChange(false);
      setReference("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Mark {batch.batch_number} as sent</DialogTitle>
            <DialogDescription>
              Record when the payroll went to the bank and the reference the bank gave you. The list
              can no longer be changed after this.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {error && <AuthAlert tone="error">{error}</AuthAlert>}
            <label className="block text-sm font-semibold">
              Date sent
              <input
                type="date"
                required
                max={localToday()}
                value={sentAt}
                onChange={(event) => setSentAt(event.target.value)}
                className={`${fieldClass} mt-2 h-11`}
              />
            </label>
            <label className="block text-sm font-semibold">
              Bank reference or transmittal number
              <input
                required
                maxLength={100}
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="e.g. LBP-TR-2027-0012"
                className={`${fieldClass} mt-2 h-11`}
              />
            </label>
          </div>
          <DialogFooter className="mt-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className={secondaryButtonClass}
            >
              Cancel
            </button>
            <button type="submit" disabled={saving} className={primaryButtonClass}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Mark as sent
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreditingDialog({
  open,
  onOpenChange,
  batch,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: PayrollBatch;
  onSaved: (result: Awaited<ReturnType<typeof recordPayrollCrediting>>) => void;
}) {
  const [sheet, setSheet] = useState<File | null>(null);
  const [proof, setProof] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sheet) return;
    setSaving(true);
    setError(null);
    try {
      const results = (await readSheet(sheet))
        .map((row) => {
          const result = pick(row, ["result", "status", "crediting_status", "remarks"]);
          return {
            osca_id_number: pick(row, OSCA_ID_COLUMNS),
            credited: isCredited(result),
            reason:
              pick(row, ["reason", "error", "failure_reason", "remarks"]) ||
              (isCredited(result) ? "" : result),
            hasResult: Boolean(result),
          };
        })
        .filter((row) => row.osca_id_number && row.hasResult)
        .map(({ hasResult: _hasResult, ...row }) => row);
      if (!results.length) {
        setError(
          "No results found. The sheet needs an OSCA ID column and a Result column (e.g. Credited or Failed).",
        );
        return;
      }
      onSaved(
        await recordPayrollCrediting(
          batch.id,
          results,
          proof ?? (/\.(pdf|png|jpe?g)$/i.test(sheet.name) ? null : sheet),
        ),
      );
      onOpenChange(false);
      setSheet(null);
      setProof(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to record the crediting report.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Record crediting report</DialogTitle>
            <DialogDescription>
              Use the exported payroll with the Result column filled in from the bank's report:
              Credited, or Failed with a reason. Rows are matched by OSCA ID.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {error && <AuthAlert tone="error">{error}</AuthAlert>}
            <label className="block text-sm font-semibold">
              Results sheet (CSV or Excel)
              <input
                type="file"
                required
                accept=".csv,.xls,.xlsx"
                onChange={(event) => setSheet(event.target.files?.[0] ?? null)}
                className={`${fieldClass} mt-2 py-2`}
              />
            </label>
            <label className="block text-sm font-semibold">
              Bank's original report (optional PDF or photo, kept as proof)
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(event) => setProof(event.target.files?.[0] ?? null)}
                className={`${fieldClass} mt-2 py-2`}
              />
            </label>
          </div>
          <DialogFooter className="mt-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className={secondaryButtonClass}
            >
              Cancel
            </button>
            <button type="submit" disabled={saving || !sheet} className={primaryButtonClass}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}{" "}
              Record results
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FailItemDialog({
  item,
  onClose,
  onSave,
}: {
  item: PayrollItem | null;
  onClose: () => void;
  onSave: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReason("");
    setError(null);
  }, [item]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(reason.trim());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Crediting failed</DialogTitle>
            <DialogDescription>
              {item ? seniorName(item) : ""} will be marked as not credited and not received for
              this period.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {error && <AuthAlert tone="error">{error}</AuthAlert>}
            <label className="block text-sm font-semibold">
              Reason from the bank
              <input
                required
                maxLength={255}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="e.g. Closed account, name mismatch"
                className={`${fieldClass} mt-2 h-11`}
              />
            </label>
          </div>
          <DialogFooter className="mt-6">
            <button type="button" onClick={onClose} className={secondaryButtonClass}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className={primaryButtonClass}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Mark failed
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
