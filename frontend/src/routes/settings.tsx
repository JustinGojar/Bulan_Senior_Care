import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  Building2,
  Check,
  ChevronRight,
  ClipboardList,
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
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{rowDescription}</p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
    </>
  );
  if (!destination)
    return (
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4">
        {content}
      </div>
    );
  return (
    <Link
      to={destination}
      className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 hover:bg-secondary"
    >
      {content}
    </Link>
  );
}

function SettingsPage() {
  const [notificationSettings, setNotificationSettings] = useState<Record<string, boolean>>(
    Object.fromEntries(
      NOTIFS.map(([label, , enabled]) => [
        label,
        label === "Email advisories" || label === "SMS advisories" ? false : enabled,
      ]),
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
          "SMS advisories": settings.sms_advisories,
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
      label === "Email advisories"
        ? "email_advisories"
        : label === "SMS advisories"
          ? "sms_advisories"
          : undefined;

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
      <div className="space-y-5">
        <main className="min-w-0 space-y-5">
          <section>
            <div className="mb-3 flex items-center gap-3">
              <SettingIcon icon={ShieldCheck} />
              <div>
                <h2 className="text-lg font-bold">System</h2>
                <p className="text-sm text-muted-foreground">
                  Core access and registry configuration
                </p>
              </div>
            </div>
            <div className="space-y-2">
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
            <div className="mb-3 flex items-center gap-3">
              <SettingIcon icon={Bell} />
              <div>
                <h2 className="text-lg font-bold">Notifications</h2>
                <p className="text-sm text-muted-foreground">
                  Configure delivery channels for system advisories
                </p>
              </div>
            </div>
            <div className="surface-card divide-y divide-border px-5">
              {NOTIFS.map(([label, desc]) => (
                <div key={label} className="flex items-center gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                    {(label === "Email advisories" || label === "SMS advisories") &&
                      channelReadiness &&
                      !channelReadiness[
                        label === "Email advisories" ? "email_advisories" : "sms_advisories"
                      ] && (
                        <p className="mt-1 text-xs text-amber-700">
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
                      ((label === "Email advisories" || label === "SMS advisories") &&
                        !notificationSettings[label] &&
                        (!channelReadiness ||
                          !channelReadiness[
                            label === "Email advisories" ? "email_advisories" : "sms_advisories"
                          ]))
                    }
                    onClick={() => void toggleNotification(label)}
                    className={`flex h-6 w-11 shrink-0 items-center rounded-full p-1 disabled:cursor-not-allowed disabled:opacity-50 ${notificationSettings[label] ? "bg-navy" : "bg-secondary"}`}
                  >
                    <span
                      className={`grid h-4 w-4 place-items-center rounded-full bg-card transition-transform ${notificationSettings[label] ? "translate-x-5" : ""}`}
                    >
                      {notificationSettings[label] && <Check className="h-3 w-3 text-primary" />}
                    </span>
                  </button>
                </div>
              ))}
            </div>
            {notificationError && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {notificationError}
              </p>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-center gap-3">
              <SettingIcon icon={SlidersHorizontal} />
              <div>
                <h2 className="text-lg font-bold">Registry & benefits</h2>
                <p className="text-sm text-muted-foreground">
                  Eligibility rules and benefit program settings
                </p>
              </div>
            </div>
            <div className="space-y-2">
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
            <div className="mb-3 flex items-center gap-3">
              <SettingIcon icon={LockKeyhole} />
              <div>
                <h2 className="text-lg font-bold">Privacy & security</h2>
                <p className="text-sm text-muted-foreground">
                  Account protection and system activity
                </p>
              </div>
            </div>
            <div className="space-y-2">
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
        </main>
      </div>
    </AppShell>
  );
}
