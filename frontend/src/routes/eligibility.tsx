import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ClipboardCheck, Eye } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { API_URL, getStoredUser } from "@/lib/api";
import { useSeniors } from "@/lib/use-seniors";
import type { Senior } from "@/lib/osca-data";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/eligibility")({
  head: () => ({ meta: [{ title: "Eligibility Review — Bulan SeniorCare" }] }),
  component: EligibilityReview,
});

function EligibilityReview() {
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const { seniors, updateSenior } = useSeniors({ pendingOnly: true });
  const pendingSeniors = seniors;
  const isHead = currentUser?.role === "head";
  const [viewing, setViewing] = useState<Senior | null>(null);

  useEffect(() => {
    if (currentUser?.role !== "admin") navigate({ to: "/dashboard", replace: true });
  }, [currentUser?.role, navigate]);

  if (currentUser?.role !== "admin") return null;

  async function reviewSenior(senior: (typeof seniors)[number], status: "Active" | "Inactive") {
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
      <section className="surface-card p-7">
        <div className="flex items-center gap-3">
          <div className="bg-navy grid h-10 w-10 place-items-center rounded-full text-primary-foreground">
            <ClipboardCheck className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Pending senior registrations</h2>
            <p className="text-sm text-muted-foreground">
              Admin review is required before a one-time grant is recorded.
            </p>
          </div>
        </div>
        <div className="mt-6 space-y-3">
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
                  <p className="mt-1 text-sm text-coral">Age {senior.age} · {senior.barangay}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Review this registration before it becomes an active record.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewing(senior)}
                    aria-label={`View full information for ${senior.name}`}
                    className="inline-flex items-center gap-2 rounded-full bg-card px-4 py-2.5 text-sm font-semibold"
                  >
                    <Eye className="h-4 w-4" /> View
                  </button>
                  {!isHead && (
                    <div className="flex gap-2">
                    <button
                      onClick={() => reviewSenior(senior, "Inactive")}
                      className="rounded-full bg-card px-4 py-2.5 text-sm font-semibold text-destructive"
                    >
                      Not eligible
                    </button>
                    <button
                      onClick={() => reviewSenior(senior, "Active")}
                      className="bg-navy rounded-full px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                    >
                      Eligible
                    </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
          {pendingSeniors.length === 0 && (
            <p className="text-sm text-muted-foreground">No pending registrations to review.</p>
          )}
        </div>
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
          {viewing?.idDocumentPath && (
            <a
              href={`${API_URL.replace(/\/api$/, "")}/storage/${viewing.idDocumentPath}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-secondary px-4 py-3 text-center text-sm font-semibold"
            >
              Open supporting document
            </a>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
