import { createFileRoute } from "@tanstack/react-router";
import { Bell, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Bulan SeniorCare" },
      {
        name: "description",
        content:
          "Configure roles and access levels, notification channels, and age threshold rules for the OSCA Bulan portal.",
      },
      { property: "og:title", content: "Settings — Bulan SeniorCare" },
      {
        property: "og:description",
        content: "Access control, notifications, and age threshold configuration for OSCA Bulan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

const ROLES = [
  ["OSCA Administrator", "Full access to records, benefits, analytics, and user management."],
  ["OSCA Head", "Reviews eligibility, approves releases, and views all analytics."],
  ["Barangay Leader", "Encodes and views records for their own barangay only."],
];

const NOTIFS = [
  ["Email advisories", "Distribution schedules and validation reminders", true],
  ["SMS advisories", "Short reminders sent to registered mobile numbers", true],
  ["Age threshold alerts", "Flags octogenarian, nonagenarian, and centenarian milestones", true],
  ["Weekly summary", "Digest of new registrations and released benefits", false],
] as const;

function SettingsPage() {
  return (
    <AppShell
      title="Settings"
      subtitle="Access control, notifications, and age threshold rules"
      breadcrumb={["Dashboard", "Settings"]}
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface-card p-7">
          <div className="flex items-center gap-3">
            <div className="bg-navy grid h-10 w-10 place-items-center rounded-full text-primary-foreground">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold">User Roles & Access Control</h2>
          </div>
          <ul className="mt-6 space-y-4">
            {ROLES.map(([role, desc]) => (
              <li key={role} className="rounded-3xl bg-secondary p-5">
                <p className="text-sm font-bold">{role}</p>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface-card p-7">
          <div className="flex items-center gap-3">
            <div className="bg-navy grid h-10 w-10 place-items-center rounded-full text-primary-foreground">
              <Bell className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold">Notifications</h2>
          </div>
          <ul className="mt-6 space-y-4">
            {NOTIFS.map(([label, desc, on]) => (
              <li key={label} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                <span
                  className={`flex h-6 w-11 shrink-0 items-center rounded-full p-1 ${
                    on ? "bg-navy" : "bg-secondary"
                  }`}
                >
                  <span
                    className={`h-4 w-4 rounded-full bg-card transition-transform ${
                      on ? "translate-x-5" : ""
                    }`}
                  />
                </span>
              </li>
            ))}
          </ul>
        </section>

      </div>
    </AppShell>
  );
}
