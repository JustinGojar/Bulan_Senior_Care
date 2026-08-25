import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Download, FileText, Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { getStoredUser } from "@/lib/api";
import { useSeniors } from "@/lib/use-seniors";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — Bulan SeniorCare" }] }),
  component: Reports,
});

const REPORTS = [
  ["Q2 2026 Benefit Distribution", "Draft", "Apr 18, 2026"],
  ["Municipal Senior Citizen Registry", "Published", "Apr 15, 2026"],
  ["Barangay Participation Summary", "Approved", "Apr 10, 2026"],
];

function Reports() {
  const isHead = getStoredUser()?.role === "head";
  const { seniors, loading } = useSeniors();
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const summary = useMemo(() => ({
    total: seniors.length,
    active: seniors.filter((senior) => senior.status === "Active").length,
    pending: seniors.filter((senior) => senior.status === "Pending").length,
    inactive: seniors.filter((senior) => senior.status === "Inactive").length,
  }), [seniors]);

  function generateReport() {
    setGeneratedAt(new Date().toLocaleString());
    toast.success("Report generated from the latest senior records.");
  }

  function printReport() {
    if (!generatedAt) generateReport();
    window.setTimeout(() => window.print(), 0);
  }

  async function exportPdf() {
    const { jsPDF } = await import("jspdf");
    const document = new jsPDF();
    const generatedDate = new Date();
    const dateLabel = generatedDate.toLocaleDateString();

    document.setFontSize(18);
    document.text("Bulan SeniorCare", 14, 18);
    document.setFontSize(13);
    document.text("Municipal Senior Citizen Registry", 14, 28);
    document.setFontSize(9);
    document.text(`Generated: ${dateLabel}`, 14, 36);

    document.setFontSize(10);
    document.text(`Total records: ${summary.total}`, 14, 50);
    document.text(`Active: ${summary.active}`, 70, 50);
    document.text(`Pending: ${summary.pending}`, 115, 50);
    document.text(`Inactive: ${summary.inactive}`, 165, 50);

    let y = 64;
    document.setFontSize(9);
    document.setFont("helvetica", "bold");
    document.text("Senior ID", 14, y);
    document.text("Name", 45, y);
    document.text("Age", 105, y);
    document.text("Barangay", 122, y);
    document.text("Benefit", 165, y);
    document.text("Status", 195, y);
    document.setFont("helvetica", "normal");
    y += 7;

    seniors.forEach((senior) => {
      if (y > 280) {
        document.addPage();
        y = 18;
      }
      document.text(senior.id, 14, y);
      document.text(document.splitTextToSize(senior.name, 55)[0] ?? senior.name, 45, y);
      document.text(String(senior.age), 105, y);
      document.text(document.splitTextToSize(senior.barangay, 40)[0] ?? senior.barangay, 122, y);
      document.text(document.splitTextToSize(senior.benefit, 28)[0] ?? senior.benefit, 165, y);
      document.text(senior.status, 195, y);
      y += 7;
    });

    document.save(`bulan-seniorcare-report-${generatedDate.toISOString().slice(0, 10)}.pdf`);
    toast.success("PDF report downloaded.");
  }

  return (
    <AppShell
      title="Reports"
      subtitle="Generate, approve, and publish OSCA reports"
      breadcrumb={["Dashboard", "Reports"]}
      actions={!isHead ? (
        <button
          onClick={generateReport}
          className="bg-navy rounded-full px-6 py-3.5 text-sm font-semibold text-primary-foreground print:hidden"
        >
          <FileText className="mr-2 inline h-4 w-4" /> Generate report
        </button>
      ) : undefined}
    >
      <section className="surface-card p-7 print:hidden">
        <div className="flex items-center gap-3">
          <div className="bg-navy grid h-10 w-10 place-items-center rounded-full text-primary-foreground">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Report workflow</h2>
            <p className="text-sm text-muted-foreground">
              Admin drafts, Head approves, and approved reports can be published or exported.
            </p>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          {REPORTS.map(([name, status, date]) => (
            <div
              key={name}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-secondary p-5"
            >
              <div>
                <p className="font-bold">{name}</p>
                <p className="mt-1 text-xs text-muted-foreground">Generated {date}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${status === "Published" ? "bg-success/15 text-success" : "bg-gold/20 text-gold-foreground"}`}
                >
                  {status === "Published" && <CheckCircle2 className="h-3 w-3" />}
                  {status}
                </span>
                <button
                  onClick={printReport}
                  className="grid h-9 w-9 place-items-center rounded-full bg-card print:hidden"
                  aria-label={`Print ${name}`}
                >
                  <Printer className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {generatedAt && (
        <section className="surface-card mt-6 p-7 print:mt-0 print:shadow-none" id="generated-report">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Generated report
              </p>
              <h2 className="mt-2 text-2xl font-extrabold">Municipal Senior Citizen Registry</h2>
              <p className="mt-1 text-sm text-muted-foreground">Generated {generatedAt}</p>
            </div>
            <button
              onClick={printReport}
              className="inline-flex items-center gap-2 rounded-full bg-secondary px-5 py-3 text-sm font-semibold print:hidden"
            >
              <Printer className="h-4 w-4" /> Print report
            </button>
            <button
              onClick={exportPdf}
              className="bg-navy inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-primary-foreground print:hidden"
            >
              <Download className="h-4 w-4" /> Export PDF
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            {[
              ["Total records", summary.total],
              ["Active", summary.active],
              ["Pending", summary.pending],
              ["Inactive", summary.inactive],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl bg-secondary p-4">
                <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                <p className="mt-2 text-2xl font-extrabold">{loading ? "..." : value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {['Senior ID', 'Name', 'Age', 'Barangay', 'Benefit', 'Status'].map((heading) => (
                    <th key={heading} className="px-3 py-3 font-bold">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {seniors.map((senior) => (
                  <tr key={senior.id} className="border-b border-border">
                    <td className="px-3 py-3">{senior.id}</td>
                    <td className="px-3 py-3 font-semibold">{senior.name}</td>
                    <td className="px-3 py-3">{senior.age}</td>
                    <td className="px-3 py-3">{senior.barangay}</td>
                    <td className="px-3 py-3">{senior.benefit}</td>
                    <td className="px-3 py-3">{senior.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </AppShell>
  );
}
