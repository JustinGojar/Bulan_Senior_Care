import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, ClipboardList, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthAlert } from "@/components/AuthLayout";
import { EmptyState, SectionHeader, TileSkeletons } from "@/components/DesignKit";
import { badgeClass, panelClass, secondaryButtonClass, tileClass } from "@/components/design-kit";
import { getAuditLogs, getStoredUser, type AuditLog, type PaginatedResponse } from "@/lib/api";

export const Route = createFileRoute("/audit-logs")({
  head: () => ({ meta: [{ title: "Audit Logs — Bulan SeniorCare" }] }),
  component: AuditLogsPage,
});

function formatTarget(targetType: string) {
  return (
    targetType
      .split("\\")
      .at(-1)
      ?.replace(/([a-z])([A-Z])/g, "$1 $2") ?? targetType
  );
}

const FIELD_LABELS: Record<string, string> = {
  barangay_id: "Barangay",
  benefit_id: "Benefit",
  contact_number: "Contact number",
  ip_address: "IP address",
  osca_id_number: "Senior Citizen ID",
  period_label: "Period",
  privacy_consent_version: "Privacy consent version",
  terms_version: "Terms version",
};

// Bookkeeping columns that change on every save and mean nothing to a reader.
const HIDDEN_FIELDS = new Set(["updated_at", "created_at"]);

function fieldLabel(key: string) {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  const words = key.replace(/_id$/, "").replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "None";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  const text = String(value);
  return /^[a-z]+(_[a-z]+)*$/.test(text) ? fieldLabel(text) : text;
}

function fieldList(value: Record<string, unknown> | null) {
  const fields = value?.["fields"];
  return Array.isArray(fields) ? fields.map(String).filter((f) => !HIDDEN_FIELDS.has(f)) : null;
}

function FieldChips({ fields, tone }: { fields: string[]; tone: "changed" | "muted" }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {fields.map((field) => (
        <span
          key={field}
          className={
            tone === "changed"
              ? "rounded-full bg-primary/10 px-2.5 py-0.5 font-semibold text-primary"
              : "rounded-full bg-muted px-2.5 py-0.5 text-muted-foreground"
          }
        >
          {fieldLabel(field)}
        </span>
      ))}
    </div>
  );
}

/** Readable summary of what an audit entry recorded, instead of raw JSON. */
function RecordedChanges({ log }: { log: AuditLog }) {
  const submitted = fieldList(log.before_value);
  const changed = fieldList(log.after_value);

  // Record updates store which fields were sent and which actually changed.
  if (submitted && changed) {
    const unchanged = submitted.filter((field) => !changed.includes(field));
    return (
      <div className="mt-2 space-y-3 rounded-lg border border-border/60 bg-card p-3">
        <div>
          <p className="font-semibold text-foreground">Changed</p>
          {changed.length > 0 ? (
            <FieldChips fields={changed} tone="changed" />
          ) : (
            <p className="mt-1 text-muted-foreground">No values changed.</p>
          )}
        </div>
        {unchanged.length > 0 && (
          <div>
            <p className="font-semibold text-foreground">Reviewed, no change</p>
            <FieldChips fields={unchanged} tone="muted" />
          </div>
        )}
      </div>
    );
  }

  const before = log.before_value ?? {};
  const after = log.after_value ?? {};
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
    (key) => !HIDDEN_FIELDS.has(key),
  );
  const showBefore = log.before_value !== null;
  const showAfter = log.after_value !== null;
  return (
    <div className="mt-2 overflow-x-auto rounded-lg border border-border/60 bg-card">
      <table className="w-full text-left">
        <thead className="bg-muted/50 text-[11px] tracking-wider text-muted-foreground uppercase">
          <tr>
            <th className="px-3 py-2 font-semibold">Field</th>
            {showBefore && <th className="px-3 py-2 font-semibold">Before</th>}
            {showAfter && <th className="px-3 py-2 font-semibold">After</th>}
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => (
            <tr key={key} className="border-t border-border/60">
              <td className="px-3 py-2 font-semibold text-foreground">{fieldLabel(key)}</td>
              {showBefore && (
                <td className="px-3 py-2 text-muted-foreground">{formatValue(before[key])}</td>
              )}
              {showAfter && <td className="px-3 py-2">{formatValue(after[key])}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = getStoredUser()?.role?.toLowerCase() === "admin";

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getAuditLogs(page)
      .then((result: PaginatedResponse<AuditLog>) => {
        setLogs(result.data);
        setLastPage(result.last_page);
        setError(null);
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [isAdmin, page]);

  return (
    <AppShell
      title="Audit Logs"
      subtitle="Recent account, senior record, and benefit activities"
      breadcrumb={["Dashboard", "Settings", "Audit Logs"]}
    >
      <section className={`${panelClass} p-4 sm:p-7`}>
        <SectionHeader
          icon={ClipboardList}
          title="Activity history"
          subtitle="Who changed what, newest first."
          badge={
            <span className={`${badgeClass} inline-flex items-center gap-1.5`}>
              {loading && <Loader2 className="h-3 w-3 animate-spin" />}
              {loading ? "Loading..." : `${logs.length} entries on this page`}
            </span>
          }
        />

        {!isAdmin && (
          <div className="mt-6">
            <AuthAlert tone="error">Only administrators can access audit logs.</AuthAlert>
          </div>
        )}
        {error && (
          <div className="mt-6">
            <AuthAlert tone="error">{error}</AuthAlert>
          </div>
        )}
        {isAdmin && !loading && !error && logs.length === 0 && (
          <EmptyState
            icon={ClipboardList}
            title="No activity recorded yet"
            description="Account, senior record and benefit changes will be listed here."
            className="mt-6"
          />
        )}

        <div className="mt-5 space-y-3">
          {isAdmin && loading && logs.length === 0 && (
            <TileSkeletons count={4} label="Loading audit logs" />
          )}
          {logs.map((log) => (
            <article key={log.id} className={`${tileClass} border-l-4 border-l-gold/70`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold capitalize">
                    {log.action.replaceAll("_", " ")}{" "}
                    <span className="font-semibold text-muted-foreground normal-case">
                      · {formatTarget(log.target_type)}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {log.actor?.name ?? "Deleted account"} · {log.actor?.role ?? "Unknown role"} ·
                    ID {log.target_id}
                  </p>
                </div>
                <time className="shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                  {new Date(log.created_at).toLocaleString()}
                </time>
              </div>
              {(log.before_value || log.after_value) && (
                <details className="mt-3 text-xs">
                  <summary className="cursor-pointer font-semibold text-primary">
                    View recorded changes
                  </summary>
                  <RecordedChanges log={log} />
                </details>
              )}
            </article>
          ))}
        </div>

        {isAdmin && lastPage > 1 && (
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1 || loading}
              aria-label="Previous page"
              className={`${secondaryButtonClass} h-10 px-3 sm:px-4`}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>
            <span className="text-sm text-muted-foreground">
              Page <span className="font-semibold text-foreground">{page}</span> of{" "}
              <span className="font-semibold text-foreground">{lastPage}</span>
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
              disabled={page === lastPage || loading}
              aria-label="Next page"
              className={`${secondaryButtonClass} h-10 px-3 sm:px-4`}
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>
    </AppShell>
  );
}
