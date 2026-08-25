import { createFileRoute } from "@tanstack/react-router";
import { MapPin, PieChart as PieIcon, Users } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { useSeniors } from "@/lib/use-seniors";

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
  const { seniors, loading } = useSeniors({ excludePending: true });
  const barangayTotals = seniors.reduce<Record<string, number>>((totals, senior) => {
    totals[senior.barangay] = (totals[senior.barangay] ?? 0) + 1;
    return totals;
  }, {});
  const zoneParticipants = Object.entries(barangayTotals).map(([zone, total]) => ({ zone, total }));
  const ageDistribution = [60, 70, 80, 90, 100].map((age) => ({
    age: `${age}${age === 100 ? "+" : "-" + (age + 9)}`,
    count: seniors.filter((senior) => senior.age >= age && senior.age < age + 10).length,
  }));
  const benefitRecords = Object.entries(
    seniors.reduce<Record<string, number>>((totals, senior) => {
      totals[senior.benefit] = (totals[senior.benefit] ?? 0) + 1;
      return totals;
    }, {}),
  ).map(([name, value]) => ({ name, value }));
  const barangaySummary = Object.entries(barangayTotals).map(([barangay, registered]) => ({
    barangay,
    registered,
    released: seniors.filter((senior) => senior.barangay === barangay && senior.status === "Active").length,
  }));

  return (
    <AppShell
      title="Analytics"
      subtitle="Descriptive analytics across barangays, age groups, and benefits"
      breadcrumb={["Dashboard", "Analytics"]}
    >
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
              <YAxis tickLine={false} axisLine={false} fontSize={12} />
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
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
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
