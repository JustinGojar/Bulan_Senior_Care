import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCheck, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { SeniorFormDialog } from "@/components/SeniorFormDialog";
import { useSeniors } from "@/lib/use-seniors";
import { getStoredUser } from "@/lib/api";

export const Route = createFileRoute("/eligibility")({
  head: () => ({ meta: [{ title: "Eligibility Review — Bulan SeniorCare" }] }),
  component: EligibilityReview,
});

function EligibilityReview() {
  const { seniors, createSenior, updateSenior } = useSeniors({ pendingOnly: true });
  const [formOpen, setFormOpen] = useState(false);
  const pendingSeniors = seniors;
  const isHead = getStoredUser()?.role === "head";

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
      actions={!isHead ? (
        <button
          onClick={() => setFormOpen(true)}
          className="bg-navy inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-card)]"
        >
          <Plus className="h-4 w-4" /> Register Senior
        </button>
      ) : undefined}
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
              </article>
            );
          })}
          {pendingSeniors.length === 0 && (
            <p className="text-sm text-muted-foreground">No pending registrations to review.</p>
          )}
        </div>
      </section>
      {!isHead && (
        <SeniorFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          onSubmit={(draft) => {
            createSenior(draft);
            toast.success(`${draft.name} was registered.`);
          }}
        />
      )}
    </AppShell>
  );
}
