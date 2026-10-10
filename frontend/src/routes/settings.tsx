import { Link, createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Bell,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  FileText,
  Gift,
  Hourglass,
  KeyRound,
  Mail,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthAlert } from "@/components/AuthLayout";
import {
  getNotificationChannelSettings,
  updateNotificationChannelSettings,
  type NotificationChannelSettings,
} from "@/lib/api";
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
  [
    "BSCA / Barangay Senior Citizen Affairs",
    "Encodes and views records for their own barangay only.",
  ],
];

const NOTIFS = [
  ["Email advisories", "Distribution schedules and validation reminders", true],
  ["Age threshold alerts", "Flags octogenarian, nonagenarian, and centenarian milestones", true],
  ["Weekly summary", "Digest of new registrations and released benefits", false],
] as const;

const NOTIF_ICONS: Record<string, typeof ShieldCheck> = {
  "Email advisories": Mail,
  "Age threshold alerts": Hourglass,
  "Weekly summary": CalendarDays,
};

const ROW_CLASS =
  "flex min-h-[68px] items-center gap-4 rounded-[8px] border border-border/50 bg-card/80 px-4 py-3 sm:px-5";

const NOTIFICATION_SETTINGS_KEY = "bulan-notification-settings";

function SettingIcon({ icon: Icon }: { icon: typeof ShieldCheck }) {
  return (
    <div className="grid w-6 shrink-0 place-items-center text-foreground/80">
      <Icon className="h-5 w-5" strokeWidth={1.75} />
    </div>
  );
}

function SettingRow({
  icon,
  title,
  description,
  to,
}: {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
  to?: "/users" | "/age-threshold" | "/benefits" | "/profile" | "/audit-logs" | "/seniors";
}) {
  const destination =
    to ??
    (title === "Security settings"
      ? "/profile"
      : title === "Audit logs"
        ? "/audit-logs"
        : title === "Barangay management"
          ? "/users"
          : title === "Senior record settings"
            ? "/seniors"
            : undefined);
  const rowDescription =
    title === "Security settings"
      ? "Change your password and manage account security"
      : title === "Barangay management"
        ? "Manage barangay leader accounts and their assigned scopes"
        : title === "Senior record settings"
          ? "Search, register, and manage senior citizen records"
          : description;
  const content = (
    <>
      <SettingIcon icon={icon} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{rowDescription}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </>
  );
  if (!destination) return <div className={ROW_CLASS}>{content}</div>;
  return (
    <Link
      to={destination}
      className={`group ${ROW_CLASS} transition-colors hover:bg-muted/70 focus-visible:outline-2 focus-visible:outline-ring`}
    >
      {content}
    </Link>
  );
}

function SettingsGroupTitle({ children }: { children: string }) {
  return <h2 className="mb-2 px-1 text-sm font-semibold">{children}</h2>;
}

function SettingsPage() {
  const [notificationSettings, setNotificationSettings] = useState<Record<string, boolean>>(
    Object.fromEntries(
      NOTIFS.map(([label, , enabled]) => [label, label === "Email advisories" ? false : enabled]),
    ),
  );
  const [channelReadiness, setChannelReadiness] = useState<NotificationChannelSettings | null>(
    null,
  );
  const [savingNotification, setSavingNotification] = useState<string | null>(null);
  const [notificationError, setNotificationError] = useState("");

  useEffect(() => {
    let cancelled = false;
    try {
      const stored = JSON.parse(localStorage.getItem(NOTIFICATION_SETTINGS_KEY) ?? "null");
      if (stored && typeof stored === "object") {
        setNotificationSettings((current) => ({
          ...current,
          "Age threshold alerts": Boolean(
            stored["Age threshold alerts"] ?? current["Age threshold alerts"],
          ),
          "Weekly summary": Boolean(stored["Weekly summary"] ?? current["Weekly summary"]),
        }));
      }
    } catch {
      localStorage.removeItem(NOTIFICATION_SETTINGS_KEY);
    }

    getNotificationChannelSettings()
      .then(({ settings, configured }) => {
        if (cancelled) return;
        setNotificationSettings((current) => ({
          ...current,
          "Email advisories": settings.email_advisories,
        }));
        setChannelReadiness(configured);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setNotificationError(
            error instanceof Error ? error.message : "Could not load notification settings.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleNotification(label: string) {
    const nextValue = !notificationSettings[label];
    const settingKey: keyof NotificationChannelSettings | undefined =
      label === "Email advisories" ? "email_advisories" : undefined;

    setSavingNotification(label);
    setNotificationError("");
    try {
      if (settingKey) {
        const { settings } = await updateNotificationChannelSettings({
          [settingKey]: nextValue,
        });
        setNotificationSettings((current) => ({
          ...current,
          [label]: settings[settingKey],
        }));
      } else {
        setNotificationSettings((current) => {
          const next = { ...current, [label]: nextValue };
          localStorage.setItem(
            NOTIFICATION_SETTINGS_KEY,
            JSON.stringify({
              "Age threshold alerts": next["Age threshold alerts"],
              "Weekly summary": next["Weekly summary"],
            }),
          );
          return next;
        });
      }
    } catch (error) {
      setNotificationError(
        error instanceof Error ? error.message : "Could not update notification settings.",
      );
    } finally {
      setSavingNotification(null);
    }
  }

  return (
    <AppShell
      title="Settings"
      subtitle="Access control, notifications, and age threshold rules"
      breadcrumb={["Dashboard", "Settings"]}
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <section>
          <SettingsGroupTitle>System</SettingsGroupTitle>
          <div className="space-y-1">
            <SettingRow
              icon={ShieldCheck}
              title="User roles & access control"
              description={ROLES.map(([role]) => role).join(" · ")}
              to="/users"
            />
            <SettingRow
              icon={Building2}
              title="Barangay management"
              description="Manage barangay scopes and registered senior coverage"
            />
            <SettingRow
              icon={FileText}
              title="Senior record settings"
              description="Required fields, documents, and validation rules"
            />
          </div>
        </section>

        <section>
          <SettingsGroupTitle>Notifications</SettingsGroupTitle>
          <div className="space-y-1">
            {NOTIFS.map(([label, desc]) => (
              <div key={label} className={ROW_CLASS}>
                <SettingIcon icon={NOTIF_ICONS[label] ?? Bell} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                  {label === "Email advisories" &&
                    channelReadiness &&
                    !channelReadiness.email_advisories && (
                      <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-gold-foreground dark:text-gold">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Configure this channel in the backend before enabling it.
                      </p>
                    )}
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notificationSettings[label]}
                  aria-label={`Toggle ${label}`}
                  aria-busy={savingNotification === label}
                  disabled={
                    savingNotification === label ||
                    (label === "Email advisories" &&
                      !notificationSettings[label] &&
                      (!channelReadiness || !channelReadiness.email_advisories))
                  }
                  onClick={() => void toggleNotification(label)}
                  className={`flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 ${notificationSettings[label] ? "bg-navy dark:bg-gold dark:bg-none" : "bg-muted-foreground/40"}`}
                >
                  <span
                    className={`grid h-4 w-4 place-items-center rounded-full bg-white shadow-sm transition-transform ${notificationSettings[label] ? "translate-x-5" : ""}`}
                  >
                    {notificationSettings[label] && <Check className="h-3 w-3 text-[#173A52]" />}
                  </span>
                </button>
              </div>
            ))}
          </div>
          {notificationError && (
            <div className="mt-3">
              <AuthAlert tone="error">{notificationError}</AuthAlert>
            </div>
          )}
        </section>

        <section>
          <SettingsGroupTitle>Registry & benefits</SettingsGroupTitle>
          <div className="space-y-1">
            <SettingRow
              icon={SlidersHorizontal}
              title="Age threshold rules"
              description={BENEFIT_PROGRAMS.filter((program) => program.type !== "social_pension")
                .map((program) => `${program.name}: ${program.minAge}+`)
                .join(" · ")}
              to="/age-threshold"
            />
            <SettingRow
              icon={Gift}
              title="Benefit & assistance settings"
              description="Programs, amounts, eligibility, and release frequency"
              to="/benefits"
            />
          </div>
        </section>

        <section>
          <SettingsGroupTitle>Privacy & security</SettingsGroupTitle>
          <div className="space-y-1">
            <SettingRow
              icon={KeyRound}
              title="Security settings"
              description="Change password, two-factor authentication, and session timeout"
            />
            <SettingRow
              icon={ClipboardList}
              title="Audit logs"
              description="Recent account, senior record, and benefit activities"
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
