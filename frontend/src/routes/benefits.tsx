import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, HandCoins, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { apiFetch, getStoredUser } from "@/lib/api";
import { useSeniors } from "@/lib/use-seniors";
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
  const [error, setError] = useState<string | null>(null);
  const { seniors, loading } = useSeniors({ excludePending: true });
  const isHead = getStoredUser()?.role === "head";

  useEffect(() => {
    apiFetch<Array<{ benefit_name: string; benefit_type: string; min_age: number; max_age: number | null; amount: string | null; schedule: string; funding_source: string }>>("/benefits")
      .then((result) => setPrograms(result.map((program) => ({
        name: program.benefit_name,
        type: program.benefit_type,
        minAge: program.min_age,
        maxAge: program.max_age ?? undefined,
        amount: program.amount ? `₱${Number(program.amount).toLocaleString()}` : "Variable",
        schedule: program.schedule === "one_time" ? "One-time" : program.schedule === "quarterly" ? "Quarterly" : "When funds are available",
        funding: program.funding_source.charAt(0).toUpperCase() + program.funding_source.slice(1),
      }))))
      .catch((reason: Error) => setError(reason.message));
  }, []);

  return (
    <AppShell
      title="Benefit Tracking"
      subtitle="Monitor program enrollment and releases"
      breadcrumb={["Dashboard", "Benefit Tracking"]}
      actions={!isHead ? (
        <button className="bg-navy rounded-full px-6 py-3.5 text-sm font-semibold text-primary-foreground">
          <HandCoins className="mr-2 inline h-4 w-4" /> Record release
        </button>
      ) : undefined}
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
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="text-left">
                {["Senior", "Program", "Barangay", "Status"].map((heading) => (
                  <th key={heading} className="px-4 py-3 font-bold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {seniors.map((senior) => (
                <tr key={senior.id} className="border-t border-border">
                  <td className="px-4 py-4 font-semibold">{senior.name}</td>
                  <td className="px-4 py-4">{senior.benefit}</td>
                  <td className="px-4 py-4 text-muted-foreground">{senior.barangay}</td>
                  <td className="px-4 py-4 font-bold text-success">
                    {senior.status === "Active" ? "Ready for release" : "For review"}
                  </td>
                </tr>
              ))}
              {!loading && seniors.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
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
