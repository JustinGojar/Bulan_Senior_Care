import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  Building2,
  Check,
  ChevronRight,
  ClipboardList,
  Database,
  FileText,
  Gift,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { BENEFIT_PROGRAMS } from "@/lib/osca-data";

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

const NOTIFICATION_SETTINGS_KEY = "bulan-notification-settings";

function SettingIcon({ icon: Icon }: { icon: typeof ShieldCheck }) {
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-navy">
      <Icon className="h-5 w-5" />
    </div>
  );
}

function SettingRow({ icon, title, description, to }: { icon: typeof ShieldCheck; title: string; description: string; to?: "/users" | "/age-threshold" | "/benefits" }) {
  const content = (
    <>
      <SettingIcon icon={icon} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
    </>
  );
  if (!to) return <div className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4">{content}</div>;
  return (
    <Link to={to} className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 hover:bg-secondary">
      {content}
    </Link>
  );
}

function SettingsPage() {
  const [notificationSettings, setNotificationSettings] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFS.map(([label, , enabled]) => [label, enabled])),
  );

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(NOTIFICATION_SETTINGS_KEY) ?? "null");
      if (stored && typeof stored === "object") {
        setNotificationSettings((current) => ({ ...current, ...stored }));
      }
    } catch {
    }
  }, []);

  function toggleNotification(label: string) {
    setNotificationSettings((current) => {
      const next = { ...current, [label]: !current[label] };
      localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }

  return (
    <AppShell
      title="Settings"
      subtitle="Access control, notifications, and age threshold rules"
      breadcrumb={["Dashboard", "Settings"]}
    >
      <div className="space-y-5">
        <main className="min-w-0 space-y-5">
          <section>
            <div className="mb-3 flex items-center gap-3"><SettingIcon icon={ShieldCheck} /><div><h2 className="text-lg font-bold">System</h2><p className="text-sm text-muted-foreground">Core access and registry configuration</p></div></div>
            <div className="space-y-2">
              <SettingRow icon={ShieldCheck} title="User roles & access control" description={ROLES.map(([role]) => role).join(" · ")} to="/users" />
              <SettingRow icon={Building2} title="Barangay management" description="Manage barangay scopes and registered senior coverage" />
              <SettingRow icon={FileText} title="Senior record settings" description="Required fields, documents, and validation rules" />
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-3"><SettingIcon icon={Bell} /><div><h2 className="text-lg font-bold">Notifications</h2><p className="text-sm text-muted-foreground">Choose which advisories appear for your account</p></div></div>
            <div className="surface-card divide-y divide-border px-5">
              {NOTIFS.map(([label, desc]) => (
                <div key={label} className="flex items-center gap-4 py-4"><div className="min-w-0 flex-1"><p className="font-semibold">{label}</p><p className="text-xs text-muted-foreground">{desc}</p></div><button type="button" role="switch" aria-checked={notificationSettings[label]} aria-label={`Toggle ${label}`} onClick={() => toggleNotification(label)} className={`flex h-6 w-11 shrink-0 items-center rounded-full p-1 ${notificationSettings[label] ? "bg-navy" : "bg-secondary"}`}><span className={`grid h-4 w-4 place-items-center rounded-full bg-card ${notificationSettings[label] ? "translate-x-5" : ""}`}>{notificationSettings[label] && <Check className="h-3 w-3 text-primary" />}</span></button></div>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-3"><SettingIcon icon={SlidersHorizontal} /><div><h2 className="text-lg font-bold">Registry & benefits</h2><p className="text-sm text-muted-foreground">Eligibility rules and benefit program settings</p></div></div>
            <div className="space-y-2"><SettingRow icon={SlidersHorizontal} title="Age threshold rules" description={BENEFIT_PROGRAMS.filter((program) => program.type !== "social_pension").map((program) => `${program.name}: ${program.minAge}+`).join(" · ")} to="/age-threshold" /><SettingRow icon={Gift} title="Benefit & assistance settings" description="Programs, amounts, eligibility, and release frequency" to="/benefits" /></div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-3"><SettingIcon icon={LockKeyhole} /><div><h2 className="text-lg font-bold">Privacy & security</h2><p className="text-sm text-muted-foreground">Account protection and system activity</p></div></div>
            <div className="space-y-2"><SettingRow icon={KeyRound} title="Security settings" description="Change password, two-factor authentication, and session timeout" /><SettingRow icon={ClipboardList} title="Audit logs" description="Recent account, senior record, and benefit activities" /><SettingRow icon={Database} title="Data & backup" description="Backup status and recovery settings" /></div>
          </section>
        </main>
      </div>
    </AppShell>
  );
}
