import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Printer,
  RefreshCw,
  Send,
  Undo2,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactElement } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { IconActionButton } from "@/components/IconActionButton";
import { EmptyState, SectionHeader, SkeletonValue, StatusPill } from "@/components/DesignKit";
import {
  TONE_BAR,
  fieldClass,
  panelClass,
  primaryButtonClass,
  secondaryButtonClass,
  tileClass,
  type Tone,
} from "@/components/design-kit";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  apiFetch,
  getBarangays,
  getStoredUser,
  type AnalyticsReport,
  type ReportSnapshot,
  type ReportType,
} from "@/lib/api";
import { loadPdfLogo } from "@/lib/pdf";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — Bulan SeniorCare" }] }),
  validateSearch: (search: Record<string, unknown>): { report?: number } => {
    const report = Number(search["report"]);
    return Number.isInteger(report) && report > 0 ? { report } : {};
  },
  component: Reports,
});

const REPORT_TYPES: Array<{ value: ReportType; description: string }> = [
  {
    value: "Municipal Summary",
    description: "Registrations and benefit releases per barangay, totaled for all of Bulan.",
  },
  {
    value: "Barangay Summary",
    description: "One barangay's registrations, benefit releases, and senior roster.",
  },
  {
    value: "Benefit Distribution",
    description: "Which seniors received which benefits, and which releases are still pending.",
  },
];

const STATUS: Record<
  AnalyticsReport["status"],
  { label: string; tone: "success" | "gold" | "danger" | "neutral" }
> = {
  draft: { label: "For review", tone: "gold" },
  returned: { label: "Returned", tone: "danger" },
  approved: { label: "Approved", tone: "neutral" },
  published: { label: "Published", tone: "success" },
};

const RELEASE_LABEL = { released: "Released", pending: "Pending", not_released: "Not released" };

// Themed tooltip so it follows light and dark mode instead of recharts' white box.
const TOOLTIP_PROPS = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--popover-foreground)",
    fontSize: 12,
  },
  labelStyle: { color: "var(--popover-foreground)", fontWeight: 700 },
  itemStyle: { color: "var(--popover-foreground)" },
  cursor: { fill: "var(--muted)", opacity: 0.5 },
};

function reportTitle(report: AnalyticsReport) {
  return report.barangay
    ? `${report.report_type} — ${report.barangay.barangay_name}`
    : report.report_type;
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString() : "—";
}

function capitalize(value: string | null | undefined) {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : "—";
}

function Reports() {
  const navigate = useNavigate();
  const { report: linkedReportId } = Route.useSearch();
  const role = getStoredUser()?.role;
  const isHead = role === "head";
  // Only Admin generates and revises reports; the Head reviews, approves, and publishes them.
  const canGenerate = role === "admin";
  const isStaff = canGenerate || isHead;

  const [reports, setReports] = useState<AnalyticsReport[] | null>(null);
  const [barangays, setBarangays] = useState<Array<{ id: number; barangay_name: string }>>([]);
  const [reportType, setReportType] = useState<ReportType>("Municipal Summary");
  const [barangayId, setBarangayId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [generating, setGenerating] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selected, setSelected] = useState<AnalyticsReport | null>(null);
  const [returning, setReturning] = useState<AnalyticsReport | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState("");
  // Only the newest View request may fill the report view.
  const latestView = useRef(0);

  useEffect(() => {
    apiFetch<AnalyticsReport[]>("/reports")
      .then(setReports)
      .catch((error: Error) => {
        setReports([]);
        toast.error(error.message);
      });
    if (canGenerate)
      getBarangays()
        .then(setBarangays)
        .catch(() => setBarangays([]));
  }, [canGenerate]);

  // Opened from a notification: show that report, then drop the id from the address bar.
  useEffect(() => {
    if (!linkedReportId) return;
    openReport(linkedReportId);
    void navigate({ to: "/reports", search: {}, replace: true });
    // openReport only reads refs and setters, so it doesn't need to be a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedReportId, navigate]);

  function scrollToTop() {
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  }

  /** Opens a report in place of the form and list; Back returns to them. */
  function openReport(id: number) {
    setSelectedId(id);
    scrollToTop();
    if (selected?.id === id) return;
    setSelected(null);
    const request = ++latestView.current;
    apiFetch<AnalyticsReport>(`/reports/${id}`)
      .then((report) => {
        if (request === latestView.current) setSelected(report);
      })
      .catch((error: Error) => {
        if (request !== latestView.current) return;
        setSelectedId(null);
        toast.error(error.message || "Could not open the report.");
      });
  }

  function closeReport() {
    latestView.current += 1;
    setSelectedId(null);
    setSelected(null);
    scrollToTop();
  }

  /** Puts a new or updated report in the list, and refreshes it if it is open. */
  function showReport(report: AnalyticsReport) {
    const { snapshot: _snapshot, ...listed } = report;
    setReports((current) =>
      current?.some((item) => item.id === report.id)
        ? current.map((item) => (item.id === report.id ? listed : item))
        : [listed, ...(current ?? [])],
    );
    if (selectedId === report.id) setSelected(report);
  }

  async function generateReport() {
    if (reportType === "Barangay Summary" && !barangayId) {
      toast.error("Choose the barangay for this summary.");
      return;
    }
    setGenerating(true);
    try {
      const report = await apiFetch<AnalyticsReport>("/reports", {
        method: "POST",
        body: JSON.stringify({
          report_type: reportType,
          barangay_id:
            reportType === "Municipal Summary" || !barangayId ? null : Number(barangayId),
          remarks: remarks.trim() || null,
        }),
      });
      showReport(report);
      latestView.current += 1;
      setSelectedId(report.id);
      setSelected(report);
      setRemarks("");
      setFormOpen(false);
      toast.success(
        isHead
          ? "Report generated. Review it, then approve it."
          : "Report generated and sent to the Head for review.",
      );
      scrollToTop();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not generate the report.");
    } finally {
      setGenerating(false);
    }
  }

  async function changeStatus(
    report: AnalyticsReport,
    status: "approved" | "returned" | "published" | "draft",
    extra: Record<string, string> = {},
  ) {
    setBusyId(report.id);
    try {
      const updated = await apiFetch<AnalyticsReport>(`/reports/${report.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, ...extra }),
      });
      showReport(updated);
      const done = {
        approved: "approved",
        returned: "returned for revision",
        published: "published",
        draft: "revised and sent back for review",
      }[status];
      toast.success(`${reportTitle(updated)} ${done}.`);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the report.");
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function submitReturn() {
    if (!returning || !reviewRemarks.trim()) return;
    if (await changeStatus(returning, "returned", { review_remarks: reviewRemarks.trim() })) {
      setReturning(null);
      setReviewRemarks("");
    }
  }

  /** The Approve, Publish, Return, and Revise buttons this account may use on a report. */
  function workflowActions(report: AnalyticsReport) {
    return (
      <>
        {isHead && report.status === "draft" && (
          <button
            onClick={() => changeStatus(report, "approved")}
            disabled={busyId === report.id}
            className={`${primaryButtonClass} h-9 px-3`}
          >
            <CheckCircle2 className="h-4 w-4" /> Approve
          </button>
        )}
        {isHead && report.status === "approved" && (
          <button
            onClick={() => changeStatus(report, "published")}
            disabled={busyId === report.id}
            className={`${primaryButtonClass} h-9 px-3`}
          >
            <Send className="h-4 w-4" /> Publish
          </button>
        )}
        {isHead && (report.status === "draft" || report.status === "approved") && (
          <button
            onClick={() => {
              setReviewRemarks("");
              setReturning(report);
            }}
            disabled={busyId === report.id}
            className={`${secondaryButtonClass} h-9 px-3`}
          >
            <Undo2 className="h-4 w-4" /> Return
          </button>
        )}
        {canGenerate && report.status === "returned" && (
          <button
            onClick={() => changeStatus(report, "draft")}
            disabled={busyId === report.id}
            title="Regenerate from the latest records and send it back to the Head"
            className={`${primaryButtonClass} h-9 px-3`}
          >
            <RefreshCw className="h-4 w-4" /> Revise
          </button>
        )}
      </>
    );
  }

  return (
    <AppShell
      title="Reports"
      subtitle={
        canGenerate
          ? "Generate OSCA reports and send them to the Head for approval"
          : isHead
            ? "Review, approve, and publish OSCA reports"
            : "Published OSCA reports for your barangay"
      }
      breadcrumb={["Dashboard", "Reports"]}
      actions={
        canGenerate && selectedId === null && !formOpen ? (
          <IconActionButton
            label="Generate report"
            variant="primary"
            icon={<FileText className="h-5 w-5" />}
            className="print:hidden"
            onClick={() => setFormOpen(true)}
          />
        ) : undefined
      }
    >
      {selectedId === null && canGenerate && formOpen && (
        <section className={`${panelClass} p-5 sm:p-7 print:hidden`}>
          <SectionHeader
            icon={FileText}
            title="Generate a report"
            subtitle="Built from the stored records. The figures are saved with the report, so what the Head approves is what gets published."
          />
          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]">
            <label className="block">
              <span className="text-sm font-semibold">Report type</span>
              <select
                value={reportType}
                onChange={(event) => setReportType(event.target.value as ReportType)}
                className={`${fieldClass} mt-2 h-11`}
              >
                {REPORT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.value}
                  </option>
                ))}
              </select>
              <span className="mt-1.5 block text-xs text-muted-foreground">
                {REPORT_TYPES.find((type) => type.value === reportType)?.description}
              </span>
            </label>
            {reportType !== "Municipal Summary" && (
              <label className="block">
                <span className="text-sm font-semibold">Barangay</span>
                <select
                  value={barangayId}
                  onChange={(event) => setBarangayId(event.target.value)}
                  className={`${fieldClass} mt-2 h-11`}
                >
                  <option value="">
                    {reportType === "Barangay Summary" ? "Choose a barangay" : "All barangays"}
                  </option>
                  {barangays.map((barangay) => (
                    <option key={barangay.id} value={barangay.id}>
                      {barangay.barangay_name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold">Remarks (optional)</span>
              <textarea
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                maxLength={1000}
                rows={2}
                placeholder="Notes for the Head, e.g. the period this report covers"
                className={`${fieldClass} mt-2 py-3`}
              />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => setFormOpen(false)}
              disabled={generating}
              className={secondaryButtonClass}
            >
              Cancel
            </button>
            <button
              onClick={generateReport}
              disabled={generating}
              aria-busy={generating}
              className={primaryButtonClass}
            >
              <FileText className="h-4 w-4" />
              {generating ? "Generating..." : "Generate report"}
            </button>
          </div>
        </section>
      )}

      {selectedId === null && (
        <section className={`${panelClass} ${formOpen ? "mt-6" : ""} p-5 sm:p-7 print:hidden`}>
          <SectionHeader
            icon={CheckCircle2}
            title={isStaff ? "Report workflow" : "Published reports"}
            subtitle={
              isStaff
                ? "Generated reports go to the Head, who approves or returns them for revision, then publishes them."
                : "Reports the OSCA Head has published for your barangay and for the municipality."
            }
          />
          <div className="mt-6 space-y-3">
            {reports === null && <SkeletonValue />}
            {reports?.length === 0 && (
              <EmptyState
                icon={FileText}
                title="No reports yet"
                description={
                  canGenerate
                    ? "Use Generate report to start the review."
                    : isHead
                      ? "Reports the Admin generates will appear here for your review."
                      : "Published reports will appear here."
                }
                compact
              />
            )}
            {reports?.map((report) => (
              <div key={report.id} className={`${tileClass} flex flex-wrap items-center gap-4`}>
                <div className="mr-auto min-w-0">
                  <p className="font-bold">{reportTitle(report)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Generated {formatDate(report.generated_date)}
                    {report.generator && ` by ${report.generator.name}`} ·{" "}
                    {report.total_registered.toLocaleString()} registered
                    {report.approver && ` · Approved by ${report.approver.name}`}
                    {report.publisher &&
                      ` · Published by ${report.publisher.name} on ${formatDate(report.published_at)}`}
                  </p>
                  {report.status === "returned" && report.review_remarks && (
                    <p className="mt-1.5 text-xs font-semibold text-destructive">
                      Returned: {report.review_remarks}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={STATUS[report.status].tone}>
                    {STATUS[report.status].label}
                  </StatusPill>
                  {workflowActions(report)}
                  <button
                    onClick={() => openReport(report.id)}
                    className={`${secondaryButtonClass} h-9 px-3`}
                    aria-label={`View ${reportTitle(report)}`}
                  >
                    <Eye className="h-4 w-4" /> View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {selectedId !== null && (
        <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
          <button onClick={closeReport} className={`${secondaryButtonClass} mr-auto h-9 px-3`}>
            <ArrowLeft className="h-4 w-4" /> Back to reports
          </button>
          {selected && workflowActions(selected)}
        </div>
      )}
      {selected?.status === "returned" && selected.review_remarks && (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive print:hidden">
          Returned for revision: {selected.review_remarks}
        </p>
      )}

      {selectedId !== null && (
        <section
          id="report-view"
          className={`${panelClass} p-5 sm:p-7 print:border-0 print:p-0 print:shadow-none`}
        >
          {selected ? (
            <ReportView report={selected} />
          ) : (
            <div className="space-y-3">
              <SkeletonValue className="h-8 w-64" />
              <SkeletonValue className="h-24 w-full" />
            </div>
          )}
        </section>
      )}

      <Dialog open={!!returning} onOpenChange={(open) => !open && setReturning(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Return for revision</DialogTitle>
            <DialogDescription>
              {returning && reportTitle(returning)} goes back to{" "}
              {returning?.generator?.name ?? "the person who generated it"} with your remarks.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={reviewRemarks}
            onChange={(event) => setReviewRemarks(event.target.value)}
            maxLength={1000}
            rows={4}
            autoFocus
            placeholder="What needs to change?"
            className={`${fieldClass} py-3`}
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setReturning(null)} className={secondaryButtonClass}>
              Cancel
            </button>
            <button
              onClick={submitReturn}
              disabled={!reviewRemarks.trim() || busyId === returning?.id}
              className={primaryButtonClass}
            >
              <Undo2 className="h-4 w-4" /> Return report
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function ReportView({ report }: { report: AnalyticsReport }) {
  const snapshot = report.snapshot;
  if (!snapshot) {
    return (
      <EmptyState
        icon={FileText}
        title="No saved figures"
        description="This report was made before reports saved their figures. Generate a new one."
        compact
      />
    );
  }
  const { totals } = snapshot;
  const isMunicipal = report.report_type === "Municipal Summary";
  const releaseTotals = snapshot.barangays.reduce(
    (sum, row) => ({
      released: sum.released + row.released,
      pending_release: sum.pending_release + row.pending_release,
    }),
    { released: 0, pending_release: 0 },
  );

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="mr-auto">
          <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Bulan SeniorCare · {snapshot.scope}
          </p>
          <h2 className="mt-2 text-2xl font-extrabold">{reportTitle(report)}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Generated {formatDate(report.generated_date)}
            {report.generator && ` by ${report.generator.name}`}
            {report.approver && ` · Approved by ${report.approver.name}`}
            {report.publisher &&
              ` · Published by ${report.publisher.name} on ${formatDate(report.published_at)}`}
          </p>
          {report.remarks && <p className="mt-1 text-sm">Remarks: {report.remarks}</p>}
        </div>
        <StatusPill tone={STATUS[report.status].tone}>{STATUS[report.status].label}</StatusPill>
        <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto print:hidden">
          <button onClick={() => window.print()} className={secondaryButtonClass}>
            <Printer className="h-4 w-4" /> Print
          </button>
          <button
            onClick={() =>
              exportPdf(report, snapshot).catch(() => toast.error("Could not create the PDF."))
            }
            className={primaryButtonClass}
          >
            <Download className="h-4 w-4" /> Export PDF
          </button>
          <button
            onClick={() =>
              exportExcel(report, snapshot).catch(() =>
                toast.error("Could not create the Excel file."),
              )
            }
            className={secondaryButtonClass}
          >
            <FileSpreadsheet className="h-4 w-4" /> Export Excel
          </button>
        </div>
      </div>
      {report.status !== "published" && (
        <p className="mt-4 rounded-lg border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-semibold">
          Not yet published. These figures may still be revised.
        </p>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["Total registered", totals.total, "navy"],
            ["Active", totals.active, "success"],
            ["Pending", totals.pending, "gold"],
            ["Inactive", totals.inactive, "coral"],
          ] as Array<[string, number, Tone]>
        ).map(([label, value, tone]) => (
          <div key={label} className={`${tileClass} relative overflow-hidden`}>
            <span className={`absolute inset-x-0 top-0 h-1 ${TONE_BAR[tone]}`} />
            <p className="text-[0.6875rem] font-semibold tracking-wider text-muted-foreground uppercase">
              {label}
            </p>
            <p className="font-display mt-2 text-2xl font-extrabold">{value.toLocaleString()}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {totals.male.toLocaleString()} male · {totals.female.toLocaleString()} female ·{" "}
        {releaseTotals.released.toLocaleString()} benefit releases done ·{" "}
        {releaseTotals.pending_release.toLocaleString()} pending
      </p>

      <div className="mt-6 grid gap-6 print:block">
        {isMunicipal && snapshot.barangays.length > 0 && (
          <ChartCard title="Registrations and benefit releases per barangay" height={320}>
            <AreaChart data={snapshot.barangays}>
              <defs>
                <linearGradient id="reportRegisteredFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="reportReleasedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="barangay" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={12}
                allowDecimals={false}
                domain={[0, "auto"]}
              />
              <Tooltip {...TOOLTIP_PROPS} />
              <Legend verticalAlign="top" wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />
              <Area
                type="monotone"
                dataKey="registered"
                name="Registered seniors"
                stroke="var(--chart-1)"
                strokeWidth={2.5}
                fill="url(#reportRegisteredFill)"
                dot={{ r: 4, fill: "var(--chart-1)" }}
              />
              <Area
                type="monotone"
                dataKey="released"
                name="Benefits released"
                stroke="var(--chart-2)"
                strokeWidth={2.5}
                fill="url(#reportReleasedFill)"
                dot={{ r: 4, fill: "var(--chart-2)" }}
              />
            </AreaChart>
          </ChartCard>
        )}
        {snapshot.benefits.length > 0 && (
          <ChartCard title="Benefit release status per program">
            <BarChart data={snapshot.benefits}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
              <Tooltip {...TOOLTIP_PROPS} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="released" name="Released" stackId="status" fill="var(--release-done)" />
              <Bar
                dataKey="pending"
                name="Pending"
                stackId="status"
                fill="var(--release-pending)"
              />
              <Bar
                dataKey="not_released"
                name="Not released"
                stackId="status"
                fill="var(--release-failed)"
              />
            </BarChart>
          </ChartCard>
        )}
      </div>

      <ReportTable
        title={isMunicipal ? "Barangay-level summary" : "Summary"}
        headings={[
          "Barangay",
          "Registered",
          "Active",
          "Pending",
          "Inactive",
          "Releases done",
          "Pending releases",
        ]}
        rows={snapshot.barangays.map((row) => [
          row.barangay,
          row.registered,
          row.active,
          row.pending,
          row.inactive,
          row.released,
          row.pending_release,
        ])}
        footer={
          isMunicipal
            ? [
                "Municipality of Bulan",
                totals.total,
                totals.active,
                totals.pending,
                totals.inactive,
                releaseTotals.released,
                releaseTotals.pending_release,
              ]
            : undefined
        }
        empty="No senior records in this scope."
      />

      <ReportTable
        title="Benefit distribution status"
        headings={["Program", "Seniors", "Released", "Pending", "Not released"]}
        rows={snapshot.benefits.map((row) => [
          row.name,
          row.seniors,
          row.released,
          row.pending,
          row.not_released,
        ])}
        empty="No benefit releases recorded yet."
      />

      {snapshot.seniors && (
        <ReportTable
          title="Senior roster"
          headings={["Senior ID", "Name", "Age", "Sex", "Status", "Registered"]}
          rows={snapshot.seniors.map((senior) => [
            senior.osca_id,
            senior.name,
            senior.age,
            capitalize(senior.sex),
            capitalize(senior.status),
            formatDate(senior.registration_date),
          ])}
          empty="No seniors registered in this barangay."
        />
      )}

      {snapshot.distribution && (
        <ReportTable
          title="Benefits per senior"
          headings={[
            "Senior ID",
            "Name",
            "Barangay",
            "Benefit",
            "Period",
            "Status",
            "Date released",
          ]}
          rows={snapshot.distribution.map((row) => [
            row.osca_id ?? "—",
            row.name,
            row.barangay,
            row.benefit,
            row.period ?? "—",
            RELEASE_LABEL[row.status],
            formatDate(row.date_distributed),
          ])}
          empty="No benefit releases recorded yet."
        />
      )}
    </>
  );
}

function ChartCard({
  title,
  height = 288,
  children,
}: {
  title: string;
  height?: number;
  children: ReactElement;
}) {
  return (
    <div className={`${tileClass} print:mt-4`}>
      <p className="text-sm font-bold">{title}</p>
      <div className="mt-3" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ReportTable({
  title,
  headings,
  rows,
  footer,
  empty,
}: {
  title: string;
  headings: string[];
  rows: Array<Array<string | number>>;
  footer?: Array<string | number> | undefined;
  empty: string;
}) {
  const cell = (value: string | number) =>
    typeof value === "number" ? value.toLocaleString() : value;
  return (
    <div className="mt-6">
      <h3 className="text-sm font-bold">{title}</h3>
      <div className="mt-2 overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="bg-muted text-left">
              {headings.map((heading) => (
                <th
                  key={heading}
                  className="px-3 py-3 text-[0.6875rem] font-semibold tracking-wider text-muted-foreground uppercase"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={headings.length}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  {empty}
                </td>
              </tr>
            )}
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-border/60">
                {row.map((value, column) => (
                  <td key={column} className={`px-3 py-2.5 ${column === 1 ? "font-semibold" : ""}`}>
                    {cell(value)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {footer && (
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/50 font-bold">
                {footer.map((value, column) => (
                  <td key={column} className="px-3 py-2.5">
                    {cell(value)}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

/** The same tables as the PDF, one worksheet each, with the report details on the first. */
async function exportExcel(report: AnalyticsReport, snapshot: ReportSnapshot) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  const { totals } = snapshot;
  const sheet = (name: string, header: string[], rows: Array<Array<string | number>>) => {
    const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
    worksheet["!cols"] = header.map((label, column) => ({
      wch: Math.min(
        40,
        Math.max(label.length, ...rows.map((row) => String(row[column] ?? "").length)) + 2,
      ),
    }));
    XLSX.utils.book_append_sheet(workbook, worksheet, name);
  };

  sheet(
    "Report",
    ["Field", "Value"],
    [
      ["Report", reportTitle(report)],
      ["Scope", snapshot.scope],
      ["Generated", formatDate(report.generated_date)],
      ["Generated by", report.generator?.name ?? "—"],
      ["Approved by", report.approver?.name ?? "Not yet approved"],
      [
        "Published",
        report.publisher
          ? `${report.publisher.name} on ${formatDate(report.published_at)}`
          : `${STATUS[report.status].label} (not yet published)`,
      ],
      ...(report.remarks ? [["Remarks", report.remarks]] : []),
      ["Total registered", totals.total],
      ["Active", totals.active],
      ["Pending", totals.pending],
      ["Inactive", totals.inactive],
      ["Male", totals.male],
      ["Female", totals.female],
    ],
  );
  sheet(
    report.report_type === "Municipal Summary" ? "Barangay summary" : "Summary",
    ["Barangay", "Registered", "Active", "Pending", "Inactive", "Released", "Pending release"],
    [
      ...snapshot.barangays.map((row) => [
        row.barangay,
        row.registered,
        row.active,
        row.pending,
        row.inactive,
        row.released,
        row.pending_release,
      ]),
      ...(report.report_type === "Municipal Summary"
        ? [
            [
              "TOTAL — Bulan",
              totals.total,
              totals.active,
              totals.pending,
              totals.inactive,
              snapshot.barangays.reduce((sum, row) => sum + row.released, 0),
              snapshot.barangays.reduce((sum, row) => sum + row.pending_release, 0),
            ],
          ]
        : []),
    ],
  );
  sheet(
    "Benefit distribution",
    ["Program", "Seniors", "Released", "Pending", "Not released"],
    snapshot.benefits.map((row) => [
      row.name,
      row.seniors,
      row.released,
      row.pending,
      row.not_released,
    ]),
  );
  if (snapshot.seniors) {
    sheet(
      "Senior roster",
      ["Senior ID", "Name", "Age", "Sex", "Status", "Registered"],
      snapshot.seniors.map((senior) => [
        senior.osca_id,
        senior.name,
        senior.age,
        capitalize(senior.sex),
        capitalize(senior.status),
        formatDate(senior.registration_date),
      ]),
    );
  }
  if (snapshot.distribution) {
    sheet(
      "Benefits per senior",
      ["Senior ID", "Name", "Barangay", "Benefit", "Period", "Status"],
      snapshot.distribution.map((row) => [
        row.osca_id ?? "—",
        row.name,
        row.barangay,
        row.benefit,
        row.period ?? "—",
        RELEASE_LABEL[row.status],
      ]),
    );
  }

  const slug = reportTitle(report)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  XLSX.writeFile(workbook, `bulan-seniorcare-${slug}-${report.generated_date.slice(0, 10)}.xlsx`);
  toast.success("Excel report downloaded.");
}

async function exportPdf(report: AnalyticsReport, snapshot: ReportSnapshot) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF();
  const logoDataUrl = await loadPdfLogo();
  const pageWidth = pdf.internal.pageSize.getWidth();
  let y = 0;

  pdf.addImage(logoDataUrl, "PNG", 14, 7, 14, 14);
  pdf.setFontSize(18);
  pdf.text("Bulan SeniorCare", 32, 18);
  pdf.setFontSize(13);
  pdf.text(reportTitle(report), 14, 30);
  pdf.setFontSize(9);
  const details = [
    `${snapshot.scope} · Generated ${formatDate(report.generated_date)}${report.generator ? ` by ${report.generator.name}` : ""}`,
    report.approver ? `Approved by ${report.approver.name}` : "Not yet approved",
    report.publisher
      ? `Published by ${report.publisher.name} on ${formatDate(report.published_at)}`
      : `Status: ${STATUS[report.status].label} (not yet published)`,
    ...(report.remarks ? [`Remarks: ${report.remarks}`] : []),
  ];
  y = 37;
  details.forEach((line) => {
    pdf.text(pdf.splitTextToSize(line, pageWidth - 28), 14, y);
    y += 5;
  });

  y += 3;
  pdf.setFontSize(10);
  const { totals } = snapshot;
  pdf.text(
    `Total registered: ${totals.total}   Active: ${totals.active}   Pending: ${totals.pending}   Inactive: ${totals.inactive}   Male: ${totals.male}   Female: ${totals.female}`,
    14,
    y,
  );
  y += 8;

  const table = (
    title: string,
    columns: Array<[string, number]>,
    rows: Array<Array<string | number>>,
  ) => {
    if (y > 260) {
      pdf.addPage();
      y = 18;
    }
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text(title, 14, y);
    y += 7;
    const header = () => {
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      columns.forEach(([label, x]) => pdf.text(label, x, y));
      pdf.setFont("helvetica", "normal");
      y += 6;
    };
    header();
    if (rows.length === 0) {
      pdf.text("None recorded.", 14, y);
      y += 6;
    }
    rows.forEach((row) => {
      if (y > 282) {
        pdf.addPage();
        y = 18;
        header();
      }
      row.forEach((value, index) => {
        const x = columns[index]![1];
        const width = (columns[index + 1]?.[1] ?? pageWidth - 10) - x - 2;
        const text = String(value);
        pdf.text(pdf.splitTextToSize(text, width)[0] ?? text, x, y);
      });
      y += 6;
    });
    y += 6;
  };

  table(
    report.report_type === "Municipal Summary" ? "Barangay-level summary" : "Summary",
    [
      ["Barangay", 14],
      ["Registered", 70],
      ["Active", 92],
      ["Pending", 110],
      ["Inactive", 128],
      ["Released", 148],
      ["Pending rel.", 172],
    ],
    [
      ...snapshot.barangays.map((row) => [
        row.barangay,
        row.registered,
        row.active,
        row.pending,
        row.inactive,
        row.released,
        row.pending_release,
      ]),
      ...(report.report_type === "Municipal Summary"
        ? [
            [
              "TOTAL — Bulan",
              totals.total,
              totals.active,
              totals.pending,
              totals.inactive,
              snapshot.barangays.reduce((sum, row) => sum + row.released, 0),
              snapshot.barangays.reduce((sum, row) => sum + row.pending_release, 0),
            ],
          ]
        : []),
    ],
  );
  table(
    "Benefit distribution status",
    [
      ["Program", 14],
      ["Seniors", 80],
      ["Released", 105],
      ["Pending", 130],
      ["Not released", 155],
    ],
    snapshot.benefits.map((row) => [
      row.name,
      row.seniors,
      row.released,
      row.pending,
      row.not_released,
    ]),
  );
  if (snapshot.seniors) {
    table(
      "Senior roster",
      [
        ["Senior ID", 14],
        ["Name", 45],
        ["Age", 110],
        ["Sex", 125],
        ["Status", 145],
        ["Registered", 170],
      ],
      snapshot.seniors.map((senior) => [
        senior.osca_id,
        senior.name,
        senior.age,
        capitalize(senior.sex),
        capitalize(senior.status),
        formatDate(senior.registration_date),
      ]),
    );
  }
  if (snapshot.distribution) {
    table(
      "Benefits per senior",
      [
        ["Senior ID", 14],
        ["Name", 40],
        ["Barangay", 85],
        ["Benefit", 115],
        ["Period", 150],
        ["Status", 172],
      ],
      snapshot.distribution.map((row) => [
        row.osca_id ?? "—",
        row.name,
        row.barangay,
        row.benefit,
        row.period ?? "—",
        RELEASE_LABEL[row.status],
      ]),
    );
  }

  const slug = reportTitle(report)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  pdf.save(`bulan-seniorcare-${slug}-${report.generated_date.slice(0, 10)}.pdf`);
  toast.success("PDF report downloaded.");
}
