import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, CheckCircle2, Download, HandCoins, Plus, ShieldCheck, XCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { API_URL, apiFetch, getStoredUser, type BenefitRelease, type BenefitTransaction } from "@/lib/api";
import { loadPdfLogo } from "@/lib/pdf";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
};

function BenefitTracking() {
  const [programs, setPrograms] = useState<BenefitProgram[]>([]);
  const [transactions, setTransactions] = useState<BenefitTransaction[]>([]);
  const [releaseSchedules, setReleaseSchedules] = useState<BenefitRelease[]>([]);
  const [releaseFormOpen, setReleaseFormOpen] = useState(false);
  const [selectedBenefitId, setSelectedBenefitId] = useState("");
  const [amount, setAmount] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [savingRelease, setSavingRelease] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentUser = getStoredUser();
  const isHead = currentUser?.role === "head";
  const canManageReleases = currentUser?.role === "admin" || currentUser?.role === "head";
  const canUpdateTransactions = currentUser?.role === "leader";

  function formatDate(date: string) {
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? new Date(`${date}T00:00:00`)
      : new Date(date);
    if (Number.isNaN(parsed.getTime())) return "No release date entered";
    return parsed.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  useEffect(() => {
    apiFetch<Array<{ id: number; benefit_name: string; benefit_type: string; min_age: number; max_age: number | null; amount: string | null; schedule: string; funding_source: string }>>("/benefits")
      .then((benefitResult) => setPrograms(benefitResult.map((program) => ({
        id: program.id,
        name: program.benefit_name,
        type: program.benefit_type,
        minAge: program.min_age,
        ...(program.max_age === null ? {} : { maxAge: program.max_age }),
        amount: program.amount ? `₱${Number(program.amount).toLocaleString()}` : "Variable",
        schedule: program.schedule === "one_time" ? "One-time" : program.schedule === "quarterly" ? "Quarterly" : "When funds are available",
        funding: program.funding_source.charAt(0).toUpperCase() + program.funding_source.slice(1),
      }))))
      .catch((reason: Error) => setError(reason.message));
    apiFetch<BenefitTransaction[]>("/benefit-transactions")
      .then(setTransactions)
      .catch(() => setTransactions([]));
    apiFetch<BenefitRelease[]>("/benefit-releases")
      .then(setReleaseSchedules)
      .catch(() => setReleaseSchedules([]));
  }, []);

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

  async function updateTransaction(transaction: BenefitTransaction, status: "released" | "failed") {
    const date = status === "released"
      ? window.prompt("Enter the actual release date (YYYY-MM-DD):", transaction.date_distributed ?? "")
      : null;
    if (status === "released" && !date) return;
    try {
      const updated = await apiFetch<BenefitTransaction>(`/benefit-transactions/${transaction.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          amount: transaction.amount,
          period_label: transaction.period_label,
          date_distributed: date,
          remarks: transaction.remarks,
        }),
      });
      setTransactions((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update benefit status.");
    }
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
          period_label: new Date(`${releaseDate}T00:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
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
    if (transactions.length === 0) {
      setError("There are no benefit records to export.");
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
      document.text(`Records: ${transactions.length}`, 14, 43);

      let y = 56;
      document.setFont("helvetica", "bold");
      document.text("Senior", 14, y);
      document.text("Program", 82, y);
      document.text("Barangay", 145, y);
      document.text("Source", 205, y);
      document.text("Status", 260, y);
      document.setFont("helvetica", "normal");
      y += 7;
      transactions.forEach((transaction) => {
        if (y > 195) {
          document.addPage();
          y = 18;
        }
        const seniorName = [transaction.senior.first_name, transaction.senior.middle_name, transaction.senior.last_name].filter(Boolean).join(" ");
        const source = transaction.senior.encoder?.name ?? "Unknown";
        const status = transaction.status === "released" ? "Received" : transaction.status === "failed" ? "Not received" : "Pending";
        document.text(document.splitTextToSize(seniorName, 62)[0] ?? seniorName, 14, y);
        document.text(document.splitTextToSize(transaction.benefit.benefit_name, 58)[0] ?? transaction.benefit.benefit_name, 82, y);
        document.text(document.splitTextToSize(transaction.senior.barangay?.barangay_name ?? "Unassigned", 54)[0] ?? "Unassigned", 145, y);
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
        <div className="flex flex-wrap gap-2">
          {isHead && (
            <button type="button" onClick={exportBenefits} className="bg-navy rounded-full px-6 py-3.5 text-sm font-semibold text-primary-foreground">
              <Download className="mr-2 inline h-4 w-4" /> Export PDF
            </button>
          )}
          {canManageReleases && (
            <button type="button" onClick={openAddRelease} className="bg-navy rounded-full px-6 py-3.5 text-sm font-semibold text-primary-foreground">
              <Plus className="mr-2 inline h-4 w-4" /> Add Release
            </button>
          )}
        </div>
      }
    >
      {error && <p className="mb-4 text-sm font-medium text-destructive">{error}</p>}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {programs.map((program) => (
          <article key={program.type} className="surface-card p-6">
            {(() => {
              const programTransactions = transactions.filter((transaction) => transaction.benefit.benefit_name === program.name);
              const received = programTransactions.filter((transaction) => transaction.status === "released").length;
              const notReceived = programTransactions.filter((transaction) => transaction.status === "failed").length;
              const pending = programTransactions.filter((transaction) => transaction.status === "pending").length;
              const releaseDates = releaseSchedules
                .filter((release) => release.benefit.benefit_name === program.name && release.status !== "cancelled")
                .map((release) => release.release_date)
                .sort()
                .reverse();
              return (
                <>
            <div className="flex items-start justify-between">
              <div className="bg-gold grid h-11 w-11 place-items-center rounded-2xl text-gold-foreground">
                <HandCoins className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold">
                {program.funding}
              </span>
            </div>
            <h2 className="mt-5 font-display text-lg font-bold">{program.name}</h2>
            <p className="mt-2 text-3xl font-extrabold">{program.amount}</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarDays className="h-4 w-4" /> {program.schedule}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Eligibility: age {program.minAge}
              {program.maxAge ? `-${program.maxAge}` : "+"}
            </p>
            <div className="mt-5 border-t border-border pt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Release status</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-success/15 px-3 py-1.5 text-success">Received: {received}</span>
                <span className="rounded-full bg-gold/20 px-3 py-1.5 text-gold-foreground">Not yet: {pending}</span>
                {notReceived > 0 && <span className="rounded-full bg-destructive/10 px-3 py-1.5 text-destructive">Not received: {notReceived}</span>}
              </div>
              <div className="mt-3 rounded-xl bg-secondary px-3 py-2">
                <p className="text-xs text-muted-foreground">Release date for this benefit type</p>
                <p className="mt-1 text-sm font-bold">
                  {releaseDates[0] ? formatDate(releaseDates[0]) : "No release date entered"}
                </p>
              </div>
            </div>
                </>
              );
            })()}
          </article>
        ))}
        {!error && programs.length === 0 && (
          <p className="text-sm text-muted-foreground">No benefit programs available.</p>
        )}
      </div>
      <section className="surface-card mt-6 p-7">
        <div className="flex items-center gap-3">
          <div className="bg-navy grid h-10 w-10 place-items-center rounded-full text-primary-foreground">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Release queue</h2>
            <p className="text-sm text-muted-foreground">
              Transactions are linked to a senior and program; one-time grants cannot be duplicated.
            </p>
          </div>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[940px] text-sm">
            <thead>
              <tr className="text-left">
                {["Senior", "Program", "Barangay", "Source", "Release date", "Status", "Audit", ...(canUpdateTransactions ? ["Action"] : [])].map((heading) => (
                  <th key={heading} className="px-4 py-3 font-bold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => {
                const seniorName = [transaction.senior.first_name, transaction.senior.middle_name, transaction.senior.last_name].filter(Boolean).join(" ");
                const statusLabel = transaction.status === "released" ? "Received" : transaction.status === "failed" ? "Not received" : "Pending";
                return (
                <tr key={transaction.id} className="border-t border-border">
                  <td className="px-4 py-4 font-semibold">{seniorName}</td>
                  <td className="px-4 py-4">{transaction.benefit.benefit_name}</td>
                  <td className="px-4 py-4 text-muted-foreground">{transaction.senior.barangay?.barangay_name ?? "Unassigned"}</td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {transaction.senior.encoder?.role === "leader" ? `Leader: ${transaction.senior.encoder.name}` : transaction.senior.encoder?.name ?? "Unknown"}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {transaction.date_distributed
                      ? formatDate(transaction.date_distributed)
                      : "-"}
                  </td>
                  <td className={`px-4 py-4 font-bold ${transaction.status === "released" ? "text-success" : transaction.status === "failed" ? "text-destructive" : "text-gold-foreground"}`}>
                    {statusLabel}
                  </td>
                  <td className="px-4 py-4 text-xs text-muted-foreground">
                    <p>Created by {transaction.creator?.name ?? transaction.distributor?.name ?? "Unknown"}</p>
                    {transaction.created_at && <p>{new Date(transaction.created_at).toLocaleString()}</p>}
                    {transaction.updater && <p className="mt-1">Modified by {transaction.updater.name}</p>}
                    {transaction.attachment_path && <a href={`${API_URL.replace(/\/api$/, "")}/storage/${transaction.attachment_path}`} target="_blank" rel="noreferrer" className="mt-1 inline-block font-semibold text-foreground underline">Open proof</a>}
                  </td>
                  {canUpdateTransactions && <td className="px-4 py-4">
                    {transaction.status === "pending" ? (
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => updateTransaction(transaction, "released")} className="inline-flex items-center gap-1 rounded-full bg-success/15 px-3 py-2 text-xs font-bold text-success">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Received
                        </button>
                        <button type="button" onClick={() => updateTransaction(transaction, "failed")} className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive">
                          <XCircle className="h-3.5 w-3.5" /> Not received
                        </button>
                      </div>
                    ) : (
                      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-bold ${transaction.status === "released" ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"}`}>
                        {transaction.status === "released" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        {transaction.status === "released" ? "Received" : "Not received"}
                      </span>
                    )}
                  </td>}
                </tr>
                );
              })}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={canUpdateTransactions ? 8 : 7} className="px-4 py-8 text-center text-muted-foreground">
                    No benefit records available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <Dialog open={releaseFormOpen} onOpenChange={(open) => { setReleaseFormOpen(open); if (!open) resetReleaseForm(); }}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Add Release</DialogTitle>
            <DialogDescription>
              Enter the actual release details. The release date is never assigned automatically.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveRelease} className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className="text-xs font-semibold text-muted-foreground">Benefit Type</span>
              <select required value={selectedBenefitId} onChange={(event) => { setSelectedBenefitId(event.target.value); const selected = programs.find((program) => String(program.id) === event.target.value); setAmount(selected?.amount === "Variable" ? "" : selected?.amount.replace(/[^0-9.]/g, "") ?? ""); }} className="mt-1 w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm">
                <option value="">Select benefit</option>
                {programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
              </select>
            </label>
            <label>
              <span className="text-xs font-semibold text-muted-foreground">Amount</span>
              <input required min="0" step="0.01" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" className="mt-1 w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm" />
            </label>
            <label>
              <span className="text-xs font-semibold text-muted-foreground">Release Date</span>
              <input required type="date" value={releaseDate} onChange={(event) => setReleaseDate(event.target.value)} className="mt-1 w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm" />
            </label>
            <label>
              <span className="text-xs font-semibold text-muted-foreground">Remarks</span>
              <input value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Optional remarks" className="mt-1 w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm" />
            </label>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" onClick={() => setReleaseFormOpen(false)} className="rounded-full bg-secondary px-5 py-3 text-sm font-semibold">Cancel</button>
              <button type="submit" disabled={savingRelease} className="bg-navy rounded-full px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">{savingRelease ? "Saving..." : "Save release"}</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
