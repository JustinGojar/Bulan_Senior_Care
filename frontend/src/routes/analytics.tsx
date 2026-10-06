import { createFileRoute } from "@tanstack/react-router";
import { MapPin, PieChart as PieIcon, TrendingUp, Users } from "lucide-react";
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
import { apiFetch, getStoredUser } from "@/lib/api";
import { useEffect, useState } from "react";

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

const PIE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];
const BENEFIT_CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--success)",
];

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
  trend: Array<{ barangay: string; registered: number; released: number; municipal: number }>;
};

function CardHead({ icon: Icon, title }: { icon: typeof MapPin; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="bg-navy grid h-10 w-10 place-items-center rounded-full text-primary-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <h2 className="text-lg font-bold">{title}</h2>
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
  const releasedBenefitRecords = analytics?.released_benefit_records ?? [];
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
        <p className="mb-6 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{error}</p>
      )}
      {loading && <p className="mb-6 text-sm text-muted-foreground">Loading analytics data...</p>}
      {!isLeader && (
        <section className="surface-card p-5 sm:p-7">
          <CardHead icon={MapPin} title="Total Participants per Zone / Barangay" />
          <div className="mt-6 h-72">
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
                  domain={[0, 200]}
                  ticks={[0, 50, 100, 150, 200]}
                />
                <Tooltip />
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
          </div>
          {loading && (
            <p className="mt-3 text-sm text-muted-foreground">Loading live analytics...</p>
          )}
          {!loading && zoneParticipants.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">No senior records available.</p>
          )}
        </section>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="surface-card p-5 sm:p-7">
          <CardHead icon={Users} title="Age Distribution" />
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageDistribution}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="age" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  domain={isLeader ? [0, "auto"] : [0, 1000]}
                  {...(isLeader
                    ? {}
                    : { ticks: [0, 50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 900, 1000] })}
                />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Seniors" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="surface-card p-5 sm:p-7">
          <CardHead icon={PieIcon} title="Benefit Records" />
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={benefitRecords}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={2}
                >
                  {benefitRecords.map((entry, i) => (
                    <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="inside"
                    fill="white"
                    fontSize={14}
                    fontWeight={700}
                  />
                </Pie>
                <Tooltip />
                <Legend formatter={(value) => String(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {!loading && benefitRecords.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">No benefit records available.</p>
          )}
        </section>
      </div>

      <section className="surface-card mt-6 p-5 sm:p-7">
        <CardHead
          icon={TrendingUp}
          title={
            isLeader
              ? "Benefits Released by Program"
              : "Trend and Analytics by Barangay and Municipality"
          }
        />
        <p className="mt-2 text-sm text-muted-foreground">
          {isLeader
            ? "Released benefit counts in your assigned barangay."
            : "Registered seniors, released benefits, and cumulative municipal registrations."}
        </p>
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            {isLeader ? (
              <BarChart data={releasedBenefitRecords}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                  height={70}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  allowDecimals={false}
                  label={{ value: "Number of seniors", angle: -90, position: "insideLeft" }}
                />
                <Tooltip />
                <Bar dataKey="senior_count" name="Seniors" radius={[4, 4, 0, 0]}>
                  {releasedBenefitRecords.map((record, index) => (
                    <Cell
                      key={record.name}
                      fill={BENEFIT_CHART_COLORS[index % BENEFIT_CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <LineChart data={trendData}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="barangay" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip />
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
            )}
          </ResponsiveContainer>
        </div>
        {isLeader ? (
          <>
            {releasedBenefitRecords.length > 0 && (
              <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2">
                {releasedBenefitRecords.map((record, index) => (
                  <div
                    key={record.name}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{
                        backgroundColor: BENEFIT_CHART_COLORS[index % BENEFIT_CHART_COLORS.length],
                      }}
                    />
                    {record.name}
                  </div>
                ))}
              </div>
            )}
            {!loading && releasedBenefitRecords.length === 0 && (
              <p className="mt-3 text-sm text-muted-foreground">
                No benefits have been released in this barangay.
              </p>
            )}
          </>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Municipal registered total: {municipalTotal.toLocaleString()}
          </p>
        )}
      </section>

      <section className="surface-card mt-6 p-5 sm:p-7">
        <CardHead
          icon={MapPin}
          title={isLeader ? "Your Barangay Summary" : "Barangay-Level Summary"}
        />
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left">
                {["Barangay", "Registered", "Benefits Released", "Coverage"].map((h) => (
                  <th key={h} className="px-4 py-3 font-bold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {barangaySummary.map((row) => {
                const pct = Math.round((row.released / row.registered) * 100);
                return (
                  <tr key={row.barangay} className="border-t border-border">
                    <td className="px-4 py-4 font-medium">{row.barangay}</td>
                    <td className="px-4 py-4 text-muted-foreground">{row.registered}</td>
                    <td className="px-4 py-4 text-muted-foreground">{row.released}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-32 rounded-full bg-secondary">
                          <div className="bg-navy h-2 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-bold">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && barangaySummary.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    No barangay records available.
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
