import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, CheckCircle2, Download, HandCoins, ShieldCheck, XCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { apiFetch, getStoredUser, type BenefitTransaction } from "@/lib/api";
import { loadPdfLogo } from "@/lib/pdf";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/benefits")({
  head: () => ({ meta: [{ title: "Benefit Tracking — Bulan SeniorCare" }] }),
  component: BenefitTracking,
});

type BenefitProgram = {
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
  const [error, setError] = useState<string | null>(null);
  const isHead = getStoredUser()?.role === "head";

  useEffect(() => {
    Promise.all([
      apiFetch<Array<{ benefit_name: string; benefit_type: string; min_age: number; max_age: number | null; amount: string | null; schedule: string; funding_source: string }>>("/benefits"),
      apiFetch<BenefitTransaction[]>("/benefit-transactions"),
    ])
      .then(([benefitResult, transactionResult]) => {
        setPrograms(benefitResult.map((program) => ({
          name: program.benefit_name,
          type: program.benefit_type,
          minAge: program.min_age,
          ...(program.max_age === null ? {} : { maxAge: program.max_age }),
          amount: program.amount ? `₱${Number(program.amount).toLocaleString()}` : "Variable",
          schedule: program.schedule === "one_time" ? "One-time" : program.schedule === "quarterly" ? "Quarterly" : "When funds are available",
          funding: program.funding_source.charAt(0).toUpperCase() + program.funding_source.slice(1),
        })));
        setTransactions(transactionResult);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  async function updateTransaction(transaction: BenefitTransaction, status: "released" | "failed") {
    try {
      const updated = await apiFetch<BenefitTransaction>(`/benefit-transactions/${transaction.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setTransactions((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update benefit status.");
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
      actions={isHead ? (
        <button type="button" onClick={exportBenefits} className="bg-navy rounded-full px-6 py-3.5 text-sm font-semibold text-primary-foreground">
          <Download className="mr-2 inline h-4 w-4" /> Export PDF
        </button>
      ) : (
        <button className="bg-navy rounded-full px-6 py-3.5 text-sm font-semibold text-primary-foreground">
          <HandCoins className="mr-2 inline h-4 w-4" /> Record release
        </button>
      )}
    >
      {error && <p className="mb-4 text-sm font-medium text-destructive">{error}</p>}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {programs.map((program) => (
          <article key={program.type} className="surface-card p-6">
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
                {["Senior", "Program", "Barangay", "Source", "Status", ...(!isHead ? ["Action"] : [])].map((heading) => (
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
                  <td className={`px-4 py-4 font-bold ${transaction.status === "released" ? "text-success" : transaction.status === "failed" ? "text-destructive" : "text-gold-foreground"}`}>
                    {statusLabel}
                    {transaction.date_distributed && <span className="ml-2 text-xs font-normal text-muted-foreground">{transaction.date_distributed}</span>}
                  </td>
                  {!isHead && <td className="px-4 py-4">
                    {transaction.status === "pending" && (
                      <div className="flex gap-2">
                        <button type="button" onClick={() => updateTransaction(transaction, "released")} className="inline-flex items-center gap-1 rounded-full bg-success/15 px-3 py-2 text-xs font-bold text-success">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Received
                        </button>
                        <button type="button" onClick={() => updateTransaction(transaction, "failed")} className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive">
                          <XCircle className="h-3.5 w-3.5" /> Not received
                        </button>
                      </div>
                    )}
                  </td>}
                </tr>
                );
              })}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={isHead ? 5 : 6} className="px-4 py-8 text-center text-muted-foreground">
                    No benefit records available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
