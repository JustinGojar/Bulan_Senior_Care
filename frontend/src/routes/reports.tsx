import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { getStoredUser } from "@/lib/api";

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
  return (
    <AppShell
      title="Reports"
      subtitle="Generate, approve, and publish OSCA reports"
      breadcrumb={["Dashboard", "Reports"]}
      actions={!isHead ? (
        <button
          onClick={() => toast.success("Report draft created.")}
          className="bg-navy rounded-full px-6 py-3.5 text-sm font-semibold text-primary-foreground"
        >
          <FileText className="mr-2 inline h-4 w-4" /> Generate report
        </button>
      ) : undefined}
    >
      <section className="surface-card p-7">
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
                  onClick={() => toast.success(`${name} queued for PDF export.`)}
                  className="grid h-9 w-9 place-items-center rounded-full bg-card"
                  aria-label={`Export ${name}`}
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
