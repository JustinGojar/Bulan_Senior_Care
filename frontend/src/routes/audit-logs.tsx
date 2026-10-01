import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, ClipboardList } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { getAuditLogs, getStoredUser, type AuditLog, type PaginatedResponse } from "@/lib/api";

export const Route = createFileRoute("/audit-logs")({
  head: () => ({ meta: [{ title: "Audit Logs — Bulan SeniorCare" }] }),
  component: AuditLogsPage,
});

function formatTarget(targetType: string) {
  return targetType.split("\\").at(-1)?.replace(/([a-z])([A-Z])/g, "$1 $2") ?? targetType;
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
    <AppShell title="Audit Logs" subtitle="Recent account, senior record, and benefit activities" breadcrumb={["Dashboard", "Settings", "Audit Logs"]}>
      <section className="surface-card p-4 sm:p-7">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-navy">
            <ClipboardList className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold">Activity history</h2>
            <p className="text-sm text-muted-foreground">{loading ? "Loading activity..." : `${logs.length} entries on this page`}</p>
          </div>
        </div>

        {!isAdmin && <p className="mt-6 rounded-lg bg-secondary p-4 text-sm">Only administrators can access audit logs.</p>}
        {error && <p className="mt-6 rounded-lg bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
        {isAdmin && !loading && !error && logs.length === 0 && <p className="mt-6 rounded-lg bg-secondary p-4 text-sm text-muted-foreground">No audit activity has been recorded yet.</p>}

        <div className="mt-5 space-y-3">
          {logs.map((log) => (
            <article key={log.id} className="rounded-lg bg-secondary p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold">{log.action.replaceAll("_", " ")} · {formatTarget(log.target_type)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{log.actor?.name ?? "Deleted account"} · {log.actor?.role ?? "Unknown role"} · ID {log.target_id}</p>
                </div>
                <time className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</time>
              </div>
              {(log.before_value || log.after_value) && (
                <details className="mt-3 text-xs">
                  <summary className="cursor-pointer font-semibold">View recorded changes</summary>
                  <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-md bg-card p-3">{JSON.stringify({ before: log.before_value, after: log.after_value }, null, 2)}</pre>
                </details>
              )}
            </article>
          ))}
        </div>

        {isAdmin && lastPage > 1 && (
          <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1 || loading} aria-label="Previous page" className="grid h-9 w-9 place-items-center rounded-full bg-secondary disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <span className="text-xs font-semibold text-muted-foreground">Page {page} of {lastPage}</span>
            <button type="button" onClick={() => setPage((current) => Math.min(lastPage, current + 1))} disabled={page === lastPage || loading} aria-label="Next page" className="grid h-9 w-9 place-items-center rounded-full bg-secondary disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        )}
      </section>
    </AppShell>
  );
}
