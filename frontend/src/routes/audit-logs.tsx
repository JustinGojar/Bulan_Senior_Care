import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, ClipboardList, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthAlert } from "@/components/AuthLayout";
import { SectionHeader, TileSkeletons } from "@/components/DesignKit";
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
          <p className={`${tileClass} mt-6 text-center text-sm text-muted-foreground`}>
            No audit activity has been recorded yet.
          </p>
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
                  <pre className="mt-2 overflow-x-auto rounded-lg border border-border/60 bg-card p-3 whitespace-pre-wrap">
                    {JSON.stringify({ before: log.before_value, after: log.after_value }, null, 2)}
                  </pre>
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
