import { createFileRoute } from "@tanstack/react-router";
import {
  MapPin,
  PieChart as PieIcon,
  TrendingUp,
  UserCheck,
  UserRound,
  Users,
  type LucideIcon,
  Gift,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { AuthAlert } from "@/components/AuthLayout";
import { EmptyState, SectionHeader, SkeletonValue } from "@/components/DesignKit";
import { Skeleton } from "@/components/ui/skeleton";
import { TONE_BAR, TONE_ICON, panelClass, statCardClass, type Tone } from "@/components/design-kit";
import { apiFetch, getStoredUser } from "@/lib/api";
import { useEffect, useState, type ReactNode } from "react";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Descriptive Analytics — Bulan SeniorCare" },
      {
        name: "description",
        content:
          "Descriptive analytics across barangays, age groups, and Expanded Centenarian programs for senior citizens of Bulan, Sorsogon.",
      },
      { property: "og:title", content: "Descriptive Analytics — Bulan SeniorCare" },
      {
        property: "og:description",
        content: "Barangay-level and municipal-level summaries of registrations and benefits.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Analytics,
});

// Color follows the benefit, never its rank, so a missing benefit doesn't repaint the rest.
const BENEFIT_COLORS: Record<string, string> = {
  "Social Pension": "var(--benefit-social)",
  "Octogenarian Grant": "var(--benefit-octo)",
  "Nonagenarian Grant": "var(--benefit-nona)",
  "Centenarian Award": "var(--benefit-cent)",
};

type AnalyticsResponse = {
  municipal: { total_registered: number; active: number; male: number; female: number };
  barangay_summary: Array<{
    barangay: string;
    registered: number;
    active: number;
    released: number;
  }>;
  age_distribution: Array<{ age: string; count: number }>;
  benefit_records: Array<{ name: string; value: number }>;
  released_benefit_records: Array<{ name: string; senior_count: number }>;
  benefit_status_records?: ReleaseStatusRecord[];
  trend: Array<{ barangay: string; registered: number; released: number; municipal: number }>;
};

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

function KpiTile({
  icon: Icon,
  tone,
  label,
  value,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className={`${statCardClass} hover:translate-y-0`}>
      <span className={`absolute inset-x-0 top-0 h-1 ${TONE_BAR[tone]}`} />
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase sm:text-xs">
          {label}
        </p>
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${TONE_ICON[tone]} ${tone === "navy" ? "dark:ring-1 dark:ring-white/20" : ""}`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="font-display mt-2 text-2xl leading-none font-extrabold sm:text-3xl">{value}</p>
    </div>
  );
}

type ReleaseStatusRecord = {
  name: string;
  released: number;
  pending: number;
  not_released: number;
};

const RELEASE_STAGES = [
  { key: "released", label: "Released", color: "var(--release-done)" },
  { key: "pending", label: "Pending", color: "var(--release-pending)" },
  { key: "not_released", label: "Not released", color: "var(--release-failed)" },
] as const;

function percent(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

/**
 * Release progress per program: a headline row, then one bar per program split into
 * released / pending / not released. Bars share one scale so volume is comparable;
 * the text on each row carries the exact counts and rate.
 */
function ReleaseProgress({ records }: { records: ReleaseStatusRecord[] }) {
  const rows = records
    .map((record) => ({
      ...record,
      total: record.released + record.pending + record.not_released,
    }))
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  const totals = rows.reduce(
    (sum, row) => ({
      released: sum.released + row.released,
      pending: sum.pending + row.pending,
      not_released: sum.not_released + row.not_released,
      total: sum.total + row.total,
    }),
    { released: 0, pending: 0, not_released: 0, total: 0 },
  );
  const maxTotal = Math.max(...rows.map((row) => row.total), 1);
  const stages = RELEASE_STAGES.filter((stage) => totals[stage.key] > 0);

  return (
    <div className="mt-6">
      <dl className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          ["Released", totals.released.toLocaleString()],
          ["Pending", totals.pending.toLocaleString()],
          ["Release rate", `${percent(totals.released, totals.total)}%`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5">
            <dt className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase sm:text-[11px]">
              {label}
            </dt>
            <dd className="font-display mt-1 text-xl leading-none font-extrabold sm:text-2xl">
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2" aria-label="Legend">
        {stages.map((stage) => (
          <li key={stage.key} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: stage.color }}
            />
            {stage.label}
          </li>
        ))}
      </ul>

      <ul className="mt-4 space-y-4">
        {rows.map((row) => (
          <li
            key={row.name}
            tabIndex={0}
            className="group relative rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span className="text-sm font-semibold">{row.name}</span>
              <span className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{row.released}</span> of {row.total}{" "}
                released ·{" "}
                <span className="font-semibold text-foreground">
                  {percent(row.released, row.total)}%
                </span>
              </span>
            </div>
            {/* Track spans the busiest program; segments sit on it with 2px gaps. */}
            <div className="mt-2 h-3 w-full rounded-full bg-muted">
              <div
                className="flex h-full gap-0.5 overflow-hidden rounded-full"
                style={{ width: `${(row.total / maxTotal) * 100}%` }}
              >
                {RELEASE_STAGES.map(
                  (stage) =>
                    row[stage.key] > 0 && (
                      <span
                        key={stage.key}
                        className="h-full first:rounded-l-full last:rounded-r-full"
                        style={{ flexGrow: row[stage.key], backgroundColor: stage.color }}
                      />
                    ),
                )}
              </div>
            </div>
            <div
              role="tooltip"
              className="pointer-events-none absolute right-0 bottom-full z-10 mb-1 hidden min-w-44 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-[var(--shadow-soft)] group-hover:block group-focus-visible:block"
            >
              <p className="font-bold">{row.name}</p>
              {RELEASE_STAGES.map((stage) => (
                <p key={stage.key} className="mt-1 flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 rounded-sm"
                      style={{ backgroundColor: stage.color }}
                    />
                    {stage.label}
                  </span>
                  <span className="font-semibold">{row[stage.key]}</span>
                </p>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Analytics() {
  const currentUser = getStoredUser();
  const isLeader = currentUser?.role === "leader";
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    apiFetch<AnalyticsResponse>("/analytics")
      .then(setAnalytics)
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);
  const barangaySummary = analytics?.barangay_summary ?? [];
  const zoneParticipants = barangaySummary.map(({ barangay: zone, registered: total }) => ({
    zone,
    total,
  }));
  const ageDistribution = analytics?.age_distribution ?? [];
  const benefitRecords = analytics?.benefit_records ?? [];
  const releaseStatusRecords = analytics?.benefit_status_records ?? [];
  const municipalTotal = analytics?.municipal.total_registered ?? 0;
  const trendData = analytics?.trend ?? [];

  return (
    <AppShell
      title="Analytics"
      subtitle={
        isLeader
          ? "Barangay-level analytics for your assigned seniors"
          : "Descriptive analytics across barangays, age groups, and benefits"
      }
      breadcrumb={["Dashboard", "Analytics"]}
    >
      {error && (
        <div className="mb-6">
          <AuthAlert tone="error">{error}</AuthAlert>
        </div>
      )}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {(
          [
            ["Total registered", analytics?.municipal.total_registered, "navy", Users],
            ["Active", analytics?.municipal.active, "success", UserCheck],
            ["Female", analytics?.municipal.female, "coral", UserRound],
            ["Male", analytics?.municipal.male, "gold", UserRound],
          ] as const
        ).map(([label, value, tone, icon]) => (
          <KpiTile
            key={label}
            icon={icon}
            tone={tone}
            label={label}
            value={value === undefined ? <SkeletonValue /> : value.toLocaleString()}
          />
        ))}
      </div>
      {!isLeader && (
        <section className={`${panelClass} p-5 sm:p-7`}>
          <SectionHeader
            icon={MapPin}
            title="Total Participants per Zone / Barangay"
            subtitle="Registered seniors in each barangay."
          />
          <div className="mt-6 h-72">
            {loading ? (
              <Skeleton className="h-full w-full rounded-lg" />
            ) : zoneParticipants.length === 0 ? (
              <EmptyState
                icon={MapPin}
                title="No senior records yet"
                description="Barangay totals appear here once seniors are registered."
                className="h-full"
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={zoneParticipants}>
                  <defs>
                    <linearGradient id="zoneFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="zone" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    allowDecimals={false}
                    domain={[0, "auto"]}
                  />
                  <Tooltip {...TOOLTIP_PROPS} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="var(--chart-1)"
                    strokeWidth={2.5}
                    fill="url(#zoneFill)"
                    dot={{ r: 4, fill: "var(--chart-1)" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className={`${panelClass} p-5 sm:p-7`}>
          <SectionHeader icon={Users} title="Age Distribution" subtitle="Seniors by age group." />
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageDistribution} margin={{ top: 20 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="age" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  allowDecimals={false}
                  domain={[0, "auto"]}
                />
                <Tooltip {...TOOLTIP_PROPS} />
                <Bar dataKey="count" name="Seniors" radius={[4, 4, 0, 0]}>
                  {/* Ordered groups: one navy hue, lighter for younger, darker for older. */}
                  {ageDistribution.map((group, index) => (
                    <Cell key={group.age} fill={`var(--age-${Math.min(index + 1, 5)})`} />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="top"
                    fill="var(--foreground)"
                    fontSize={12}
                    fontWeight={700}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className={`${panelClass} p-5 sm:p-7`}>
          <SectionHeader
            icon={PieIcon}
            title="Benefit Records"
            subtitle="Seniors per benefit, based on their age."
          />
          <div className="mt-6 h-72">
            {!loading && benefitRecords.length === 0 ? (
              <EmptyState
                icon={PieIcon}
                title="No benefit records yet"
                description="Benefit assignments will be charted here."
                className="h-full"
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={benefitRecords}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={92}
                    paddingAngle={2}
                    stroke="var(--card)"
                    strokeWidth={2}
                  >
                    {benefitRecords.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={BENEFIT_COLORS[entry.name] ?? "var(--muted-foreground)"}
                      />
                    ))}
                    <LabelList
                      dataKey="value"
                      position="outside"
                      offset={10}
                      fill="var(--foreground)"
                      stroke="none"
                      fontSize={13}
                      fontWeight={700}
                    />
                  </Pie>
                  <Tooltip {...TOOLTIP_PROPS} />
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: "var(--muted-foreground)" }}>
                        {String(value)} ·{" "}
                        <strong style={{ color: "var(--foreground)" }}>
                          {benefitRecords.find((record) => record.name === value)?.value ?? 0}
                        </strong>
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      <section className={`${panelClass} mt-6 p-5 sm:p-7`}>
        <SectionHeader
          icon={TrendingUp}
          title={
            isLeader
              ? "Benefits Released by Program"
              : "Trend and Analytics by Barangay and Municipality"
          }
          subtitle={
            isLeader
              ? "Released benefit counts in your assigned barangay."
              : "Registered seniors, released benefits, and cumulative municipal registrations."
          }
        />
        {isLeader ? (
          loading ? (
            <Skeleton className="mt-6 h-56 w-full rounded-lg" />
          ) : releaseStatusRecords.some(
              (record) => record.released + record.pending + record.not_released > 0,
            ) ? (
            <ReleaseProgress records={releaseStatusRecords} />
          ) : (
            <EmptyState
              compact
              icon={Gift}
              title="No releases yet"
              description="Benefit releases in this barangay will be tracked here."
              className="mt-6"
            />
          )
        ) : (
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="barangay" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip {...TOOLTIP_PROPS} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="registered"
                  name="Barangay registered"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="released"
                  name="Benefits released"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="municipal"
                  name="Municipal cumulative"
                  stroke="var(--chart-3)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {!isLeader && (
          <p className="mt-3 text-xs text-muted-foreground">
            Municipal registered total: {municipalTotal.toLocaleString()}
          </p>
        )}
      </section>

      <section className={`${panelClass} mt-6 p-5 sm:p-7`}>
        <SectionHeader
          icon={MapPin}
          title={isLeader ? "Your Barangay Summary" : "Barangay-Level Summary"}
          subtitle="Share of registered seniors who have received a benefit."
        />
        <div className="mt-6 overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="bg-muted text-left">
                {["Barangay", "Registered", "Benefits Released", "Coverage"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {barangaySummary.map((row) => {
                const pct = Math.round((row.released / row.registered) * 100);
                return (
                  <tr key={row.barangay} className="border-t border-border/60">
                    <td className="px-4 py-3.5 font-semibold">{row.barangay}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{row.registered}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{row.released}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-32 rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-success"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && barangaySummary.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <EmptyState
                      bare
                      compact
                      icon={MapPin}
                      title="No barangay records yet"
                      description="Each barangay's totals appear here once seniors are registered."
                    />
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
