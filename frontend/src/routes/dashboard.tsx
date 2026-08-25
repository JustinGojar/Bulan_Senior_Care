import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Clock, Megaphone, ShieldCheck, UserCheck, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useSeniors } from "@/lib/use-seniors";
import { findNewEligibilityFlags } from "@/lib/osca-data";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "System Dashboard — Bulan SeniorCare" },
      {
        name: "description",
        content:
          "Overview of OSCA Bulan operations: registered seniors, benefits distributed, pending applications, and distribution status.",
      },
      { property: "og:title", content: "System Dashboard — Bulan SeniorCare" },
      {
        property: "og:description",
        content: "Live overview of senior citizen registrations and benefit distribution in Bulan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const TONES: Record<string, string> = {
  gold: "bg-gold",
  navy: "bg-navy",
  coral: "bg-coral",
};

function Dashboard() {
  const { seniors, totalCount, activeCount, pendingCount, loading } = useSeniors();
  const eligibilityFlags = findNewEligibilityFlags(
    seniors.filter((senior) => senior.status !== "Pending"),
  );

  return (
    <AppShell
      title="System Dashboard"
      subtitle="Overview of OSCA Bulan operations and analytics"
      breadcrumb={["Dashboard"]}
    >
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <article className="surface-card p-6">
          <div className="flex items-start justify-between">
            <div className="bg-navy grid h-12 w-12 place-items-center rounded-2xl text-primary-foreground">
              <Users className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-[10px] font-bold tracking-wider text-muted-foreground">
              LIVE
            </span>
          </div>
          <p className="mt-6 text-sm font-semibold text-muted-foreground">Total Registered</p>
          <p className="font-display text-4xl font-extrabold">
            {loading ? "..." : totalCount.toLocaleString()}
          </p>
          <p className="mt-4 text-xs text-muted-foreground">Current senior records</p>
        </article>

        <article className="surface-card p-6">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gold text-gold-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <p className="mt-6 text-sm font-semibold text-muted-foreground">
            Total Benefits Distributed
          </p>
          <p className="font-display text-4xl font-extrabold">{loading ? "..." : "0"}</p>
          <p className="mt-4 text-xs text-muted-foreground">No distribution data available</p>
        </article>

        <article className="surface-card p-6">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-success text-success-foreground">
            <UserCheck className="h-5 w-5" />
          </div>
          <p className="mt-6 text-sm font-semibold text-muted-foreground">Active Seniors</p>
          <p className="font-display text-4xl font-extrabold">
            {loading ? "..." : activeCount.toLocaleString()}
          </p>
          <p className="mt-4 text-xs text-muted-foreground">Verified and receiving benefits</p>
        </article>

        <article className="surface-card p-6">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-coral text-coral-foreground">
            <Clock className="h-5 w-5" />
          </div>
          <p className="mt-6 text-sm font-semibold text-muted-foreground">Pending Applications</p>
          <p className="font-display text-4xl font-extrabold">
            {loading ? "..." : pendingCount.toLocaleString()}
          </p>
          <p className="mt-4 text-xs text-muted-foreground">Awaiting eligibility verification</p>
        </article>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="surface-card p-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-navy grid h-10 w-10 place-items-center rounded-full text-primary-foreground">
                <Megaphone className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-bold">Announcements</h2>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
              3 new
            </span>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">No current announcements.</p>
        </section>

        <section className="surface-card p-7">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-navy grid h-10 w-10 place-items-center rounded-full text-primary-foreground">
                <Clock className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-bold">Distribution Status</h2>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
              Q2 2026
            </span>
          </div>
          <p className="mt-7 text-sm text-muted-foreground">No distribution data available.</p>
        </section>
      </div>

      <section className="surface-card mt-6 p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-gold text-gold-foreground">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Age Threshold Detection</h2>
              <p className="text-sm text-muted-foreground">
                Derived eligibility surfaced from current senior ages.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-gold/20 px-3 py-1 text-xs font-bold text-gold-foreground">
            {loading ? "Loading..." : `${eligibilityFlags.length} flags to review`}
          </span>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {eligibilityFlags.slice(0, 6).map(({ senior, program, reason }) => (
            <div key={`${senior.id}-${program.type}`} className="rounded-2xl bg-secondary p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-bold">{senior.name}</p>
                <span className="shrink-0 text-xs font-bold text-gold-foreground">
                  Age {senior.age}
                </span>
              </div>
              <p className="mt-2 text-xs font-semibold text-coral">{program.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{reason}</p>
            </div>
          ))}
          {loading && <p className="text-sm text-muted-foreground">Loading senior records...</p>}
          {!loading && eligibilityFlags.length === 0 && (
            <p className="text-sm text-muted-foreground">No age threshold flags.</p>
          )}
        </div>
      </section>
    </AppShell>
  );
}
