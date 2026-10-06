import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, ClipboardCheck, Eye, Search, X, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { IconActionButton, IconSelect } from "@/components/IconActionButton";
import { API_URL, getStoredUser } from "@/lib/api";
import { useSeniors } from "@/lib/use-seniors";
import { BARANGAYS, type Senior } from "@/lib/osca-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/eligibility")({
  head: () => ({ meta: [{ title: "Eligibility Review — Bulan SeniorCare" }] }),
  component: EligibilityReview,
});

function isImageDocument(path: string) {
  return /\.(jpe?g|png|webp)$/i.test(path);
}

function EligibilityReview() {
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [barangay, setBarangay] = useState("");
  const {
    seniors: pendingSeniors,
    matchingCount,
    lastPage,
    loading,
    error,
    updateSenior,
  } = useSeniors({
    pendingOnly: true,
    page,
    perPage: 10,
    search,
    barangay,
  });
  const [viewing, setViewing] = useState<Senior | null>(null);

  useEffect(() => {
    if (!(["admin", "head"] as string[]).includes(currentUser?.role ?? "")) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [currentUser?.role, navigate]);

  useEffect(() => {
    if (!loading && !error && pendingSeniors.length === 0 && page > 1) {
      setPage((current) => current - 1);
    }
  }, [error, loading, page, pendingSeniors.length]);

  if (!(["admin", "head"] as string[]).includes(currentUser?.role ?? "")) return null;

  async function reviewSenior(senior: Senior, status: "Active" | "Inactive") {
    try {
      await updateSenior(senior.id, { ...senior, status });
      toast.success(`${senior.name} marked ${status === "Active" ? "eligible" : "not eligible"}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update eligibility.");
    }
  }

  return (
    <AppShell
      title="Eligibility Review"
      subtitle="Verify age-threshold flags before enrollment"
      breadcrumb={["Dashboard", "Eligibility Review"]}
    >
      <section className="surface-card p-4 sm:p-7">
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-navy grid h-10 w-10 place-items-center rounded-full text-primary-foreground">
            <ClipboardCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold">Pending senior registrations</h2>
            <p className="text-sm text-muted-foreground">
              Admin review is required before a one-time grant is recorded.
            </p>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-2 sm:gap-3">
          <label className="relative block min-w-0 flex-1">
            <span className="sr-only">Search pending registrations</span>
            <Search
              aria-hidden="true"
              className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search name or OSCA ID"
              className="h-10 w-full rounded-[10px] border border-[#173A52]/20 bg-card pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring/30 sm:h-12 sm:rounded-full sm:border-border"
            />
          </label>
          <IconSelect
            label="Barangay"
            icon={<MapPin className="h-4 w-4" />}
            value={barangay}
            defaultValue=""
            className="sm:h-12 sm:w-60 sm:rounded-full sm:px-4"
            options={[
              { value: "", label: "All barangays" },
              ...BARANGAYS.map((name) => ({ value: name, label: name })),
            ]}
            onChange={(value) => {
              setBarangay(value);
              setPage(1);
            }}
          />
          {(search || barangay) && (
            <IconActionButton
              label="Clear filters"
              variant="outline"
              icon={<X className="h-4 w-4" />}
              className="h-10 w-10 hover:translate-y-0 sm:h-12 sm:rounded-full sm:border-0 sm:bg-secondary sm:px-4 sm:text-foreground sm:shadow-none"
              onClick={() => {
                setSearch("");
                setBarangay("");
                setPage(1);
              }}
            />
          )}
        </div>
        <div className="mt-6 space-y-3">
          {loading && (
            <p className="text-sm text-muted-foreground">Loading pending registrations...</p>
          )}
          {error && (
            <p className="text-sm text-destructive">
              Unable to load pending registrations. Please refresh and try again.
            </p>
          )}
          {pendingSeniors.map((senior) => {
            return (
              <article
                key={senior.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-secondary p-5"
              >
                <div>
                  <p className="font-bold">
                    {senior.name}{" "}
                    <span className="ml-2 text-xs font-semibold text-muted-foreground">
                      {senior.id}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-coral">
                    Age {senior.age} · {senior.barangay}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Review this registration before it becomes an active record.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setViewing(senior)}
                    aria-label={`View full information for ${senior.name}`}
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-card px-4 py-2.5 text-sm font-semibold"
                  >
                    <Eye className="h-4 w-4" /> View
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => reviewSenior(senior, "Inactive")}
                      className="whitespace-nowrap rounded-full bg-card px-4 py-2.5 text-sm font-semibold text-destructive"
                    >
                      Not eligible
                    </button>
                    <button
                      onClick={() => reviewSenior(senior, "Active")}
                      className="bg-navy whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                    >
                      Eligible
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
          {!loading && !error && pendingSeniors.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {search || barangay
                ? "No pending registrations match these filters."
                : "No pending registrations to review."}
            </p>
          )}
        </div>
        {matchingCount > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <span className="text-xs text-muted-foreground">
              Showing {(page - 1) * 10 + 1}-{Math.min(page * 10, matchingCount)} of {matchingCount}{" "}
              pending registrations
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1 || loading}
                aria-label="Previous page"
                className="grid h-9 w-9 place-items-center rounded-full bg-secondary disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-semibold text-muted-foreground">
                Page {page} of {lastPage}
              </span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
                disabled={page >= lastPage || loading}
                aria-label="Next page"
                className="grid h-9 w-9 place-items-center rounded-full bg-secondary disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </section>
      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{viewing?.name}</DialogTitle>
            <DialogDescription>Full senior citizen information</DialogDescription>
          </DialogHeader>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            {[
              ["Senior ID", viewing?.id],
              ["Name", viewing?.name],
              ["Age", viewing?.age],
              ["Barangay", viewing?.barangay],
              ["Contact", viewing?.contact],
              ["Benefit", viewing?.benefit],
              ["Status", viewing?.status],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="mt-1 font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-5 border-t border-border pt-5">
            <p className="text-sm font-bold">Supporting Documents</p>
            <div className="mt-3 grid grid-cols-2 gap-4">
              {(
                [
                  ["Valid ID", viewing?.validIdPath ?? viewing?.idDocumentPath],
                  ["Birth Certificate", viewing?.birthCertificatePath],
                ] as [string, string | null | undefined][]
              ).map(([label, path]) => (
                <div key={label} className="min-w-0">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  {path ? (
                    <a
                      href={`${API_URL.replace(/\/api$/, "")}/storage/${path}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block text-sm font-semibold"
                    >
                      {isImageDocument(path) ? (
                        <img
                          src={`${API_URL.replace(/\/api$/, "")}/storage/${path}`}
                          alt={label}
                          className="h-24 w-full rounded-xl border border-border object-cover"
                        />
                      ) : (
                        <span className="block rounded-xl bg-secondary px-3 py-4 text-center">
                          Open document
                        </span>
                      )}
                    </a>
                  ) : (
                    <span className="mt-2 block rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                      Not uploaded
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
