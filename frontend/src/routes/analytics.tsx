import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { apiFetch, getStoredUser, type ApiSenior, type BenefitTransaction, type PaginatedResponse } from "@/lib/api";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Descriptive Analytics — Bulan SeniorCare" },
      {
        name: "description",
        content:
          "Descriptive analytics across barangays, age groups, and benefit types for senior citizens of Bulan, Sorsogon.",
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

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
];

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
  const navigate = useNavigate();
  const currentUser = getStoredUser();
  const [seniors, setSeniors] = useState<ApiSenior[]>([]);
  const [transactions, setTransactions] = useState<BenefitTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (currentUser?.role === "leader") navigate({ to: "/dashboard", replace: true });
    if (currentUser?.role !== "leader") {
      Promise.all([
        apiFetch<PaginatedResponse<ApiSenior>>("/seniors?exclude_pending=1&per_page=1000"),
        apiFetch<PaginatedResponse<BenefitTransaction>>("/benefit-transactions?per_page=1000"),
      ])
        .then(([seniorResult, transactionResult]) => {
          setSeniors(seniorResult.data);
          setTransactions(transactionResult.data);
        })
        .catch((reason: Error) => setError(reason.message))
        .finally(() => setLoading(false));
    }
  }, [currentUser?.role, navigate]);
  if (currentUser?.role === "leader") return null;
  const barangayTotals = seniors.reduce<Record<string, number>>((totals, senior) => {
    const barangay = senior.barangay?.barangay_name ?? "Unassigned";
    totals[barangay] = (totals[barangay] ?? 0) + 1;
    return totals;
  }, {});
  const releasedByBarangay = transactions.reduce<Record<string, number>>((totals, transaction) => {
    if (transaction.status !== "released") return totals;
    const barangay = transaction.senior.barangay?.barangay_name ?? "Unassigned";
    totals[barangay] = (totals[barangay] ?? 0) + 1;
    return totals;
  }, {});
  const barangaySummary = Object.entries(barangayTotals).map(([barangay, registered]) => ({
    barangay,
    registered,
    released: releasedByBarangay[barangay] ?? 0,
  }));
  const zoneParticipants = barangaySummary.map(({ barangay: zone, registered: total }) => ({ zone, total }));
  const ageDistribution = [60, 70, 80, 90, 100].map((age) => ({
    age: `${age}${age === 100 ? "+" : "-" + (age + 9)}`,
    count: seniors.filter((senior) => {
      const birthYear = Number(String(senior.birthdate).slice(0, 4));
      const seniorAge = new Date().getFullYear() - birthYear;
      return seniorAge >= age && (age === 100 || seniorAge < age + 10);
    }).length,
  }));
  const benefitRecords = Object.entries(transactions.reduce<Record<string, number>>((totals, transaction) => {
    const name = transaction.benefit.benefit_name;
    totals[name] = (totals[name] ?? 0) + 1;
    return totals;
  }, {})).map(([name, value]) => ({ name, value }));
  const municipalTotal = barangaySummary.reduce((total, row) => total + row.registered, 0);
  const trendData = barangaySummary.map((row, index) => ({
    barangay: row.barangay,
    registered: row.registered,
    released: row.released,
    municipal: barangaySummary.slice(0, index + 1).reduce((total, item) => total + item.registered, 0),
  }));

  return (
    <AppShell
      title="Analytics"
      subtitle="Descriptive analytics across barangays, age groups, and benefits"
      breadcrumb={["Dashboard", "Analytics"]}
    >
      {error && <p className="mb-6 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
      {loading && <p className="mb-6 text-sm text-muted-foreground">Loading analytics data...</p>}
      <section className="surface-card p-7">
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
              <YAxis tickLine={false} axisLine={false} fontSize={12} domain={[0, 1000]} ticks={[0, 50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 900, 1000]} />
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
        {loading && <p className="mt-3 text-sm text-muted-foreground">Loading live analytics...</p>}
        {!loading && zoneParticipants.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">No senior records available.</p>
        )}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="surface-card p-7">
          <CardHead icon={Users} title="Age Distribution" />
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageDistribution}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="age" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} domain={[0, 1000]} ticks={[0, 50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 900, 1000]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Seniors" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="surface-card p-7">
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
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {!loading && benefitRecords.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">No benefit records available.</p>
          )}
        </section>
      </div>

      <section className="surface-card mt-6 p-7">
        <CardHead icon={TrendingUp} title="Trend and Analytics by Barangay and Municipality" />
        <p className="mt-2 text-sm text-muted-foreground">Registered seniors, released benefits, and cumulative municipal registrations.</p>
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="barangay" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="registered" name="Barangay registered" stroke="var(--chart-1)" strokeWidth={2} />
              <Line type="monotone" dataKey="released" name="Benefits released" stroke="var(--chart-2)" strokeWidth={2} />
              <Line type="monotone" dataKey="municipal" name="Municipal cumulative" stroke="var(--chart-3)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Municipal registered total: {municipalTotal.toLocaleString()}</p>
      </section>

      <section className="surface-card mt-6 p-7">
        <CardHead icon={MapPin} title="Barangay-Level Summary" />
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
