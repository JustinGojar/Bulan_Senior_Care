import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SectionHeader, StatusPill } from "@/components/DesignKit";
import { panelClass, secondaryButtonClass, tileClass } from "@/components/design-kit";
import { IconActionButton } from "@/components/IconActionButton";
import {
  deleteServerNotification,
  getServerNotifications,
  markServerNotificationRead,
  type ServerNotification,
} from "@/lib/api";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Bulan SeniorCare" }] }),
  component: Notifications,
});

function Notifications() {
  const navigate = useNavigate();
  const [serverNotifications, setServerNotifications] = useState<ServerNotification[]>([]);
  const [selectedNotificationIds, setSelectedNotificationIds] = useState<number[]>([]);

  const allSelected =
    serverNotifications.length > 0 && selectedNotificationIds.length === serverNotifications.length;

  function notificationTitle(notification: ServerNotification) {
    if (notification.source_type === "benefit_release") return "Benefit release schedule";
    if (notification.source_type === "announcement") return "Announcement update";
    if (notification.source_type === "age_threshold") return "Age threshold alert";
    if (notification.message.toLowerCase().includes("comment")) return "Announcement comment";
    return "System notification";
  }

  useEffect(() => {
    getServerNotifications()
      .then((notifications) => {
        setServerNotifications(notifications);
        setSelectedNotificationIds([]);
        const unread = notifications.filter((notification) => notification.status === "unread");
        if (unread.length === 0) return;
        return Promise.all(
          unread.map((notification) => markServerNotificationRead(notification.id)),
        );
      })
      .then((updated) => {
        if (!updated) return;
        const updatedById = new Map(updated.map((notification) => [notification.id, notification]));
        setServerNotifications((current) =>
          current.map((notification) => updatedById.get(notification.id) ?? notification),
        );
        window.dispatchEvent(new Event("bulan-unread-updated"));
      })
      .catch(() => setServerNotifications([]));
  }, []);

  function markAllServerNotificationsRead() {
    Promise.all(
      serverNotifications
        .filter((notification) => notification.status === "unread")
        .map((notification) => markServerNotificationRead(notification.id)),
    )
      .then((updated) => {
        const updatedById = new Map(updated.map((notification) => [notification.id, notification]));
        setServerNotifications((current) =>
          current.map((notification) => updatedById.get(notification.id) ?? notification),
        );
        window.dispatchEvent(new Event("bulan-unread-updated"));
      })
      .catch(() => undefined);
  }

  function deleteNotification(id: number) {
    deleteServerNotification(id)
      .then(() => {
        setServerNotifications((current) =>
          current.filter((notification) => notification.id !== id),
        );
        setSelectedNotificationIds((current) => current.filter((selectedId) => selectedId !== id));
      })
      .catch(() => undefined);
  }

  function toggleSelectAll() {
    setSelectedNotificationIds(
      allSelected ? [] : serverNotifications.map((notification) => notification.id),
    );
  }

  function toggleNotificationSelection(id: number) {
    setSelectedNotificationIds((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id],
    );
  }

  function clearSelectedNotifications() {
    if (selectedNotificationIds.length === 0) return;
    Promise.all(selectedNotificationIds.map((id) => deleteServerNotification(id)))
      .then(() => {
        const selectedIds = new Set(selectedNotificationIds);
        setServerNotifications((current) =>
          current.filter((notification) => !selectedIds.has(notification.id)),
        );
        setSelectedNotificationIds([]);
      })
      .catch(() => undefined);
  }

  function handleOpenServerNotification(notification: ServerNotification) {
    const markRead =
      notification.status === "unread"
        ? markServerNotificationRead(notification.id)
            .then((updated) =>
              setServerNotifications((current) =>
                current.map((item) => (item.id === updated.id ? updated : item)),
              ),
            )
            .catch(() => undefined)
        : Promise.resolve();
    const destination =
      notification.source_type === "announcement" && notification.source_id
        ? { to: "/dashboard" as const, hash: `announcement-${notification.source_id}` }
        : notification.source_type === "benefit_release" && notification.source_id
          ? { to: "/benefits" as const, search: { release: String(notification.source_id) } }
          : { to: "/dashboard" as const };
    void markRead.then(() => navigate(destination));
  }

  return (
    <AppShell
      title="Notifications"
      subtitle="System alerts and operational messages"
      breadcrumb={["Dashboard", "Notifications"]}
    >
      <section className={`${panelClass} p-5 sm:p-7`}>
        <SectionHeader
          icon={Bell}
          title="Inbox"
          subtitle="Age threshold, benefit, report, and workflow notifications."
          badge={
            serverNotifications.some((notification) => notification.status === "unread") ? (
              <StatusPill tone="gold">
                {
                  serverNotifications.filter((notification) => notification.status === "unread")
                    .length
                }{" "}
                unread
              </StatusPill>
            ) : undefined
          }
        />
        <div
          className={`${tileClass} mt-6 flex flex-wrap items-center justify-between gap-3 py-2.5`}
        >
          <label className="inline-flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              disabled={serverNotifications.length === 0}
              className="h-4 w-4 accent-[var(--navy)]"
            />
            Select all
          </label>
          <div className="flex flex-wrap justify-end gap-2">
            <IconActionButton
              label="Mark all as read"
              variant="outline"
              icon={<CheckCheck className="h-4 w-4" />}
              className="h-10 w-10 text-xs hover:translate-y-0 sm:h-9 sm:px-3 sm:shadow-none"
              onClick={markAllServerNotificationsRead}
              disabled={
                !serverNotifications.some((notification) => notification.status === "unread")
              }
            />
            <IconActionButton
              label={
                selectedNotificationIds.length > 0
                  ? `Clear selected (${selectedNotificationIds.length})`
                  : "Clear selected"
              }
              variant="outline"
              icon={<Trash2 className="h-4 w-4" />}
              badge={selectedNotificationIds.length}
              className="h-10 w-10 text-xs text-destructive hover:translate-y-0 sm:h-9 sm:px-3 sm:shadow-none dark:text-destructive"
              onClick={clearSelectedNotifications}
              disabled={selectedNotificationIds.length === 0}
            />
          </div>
        </div>
        <div className="mt-3 space-y-3">
          {serverNotifications.map((notification) => (
            <div
              key={`server-${notification.id}`}
              onClick={() => handleOpenServerNotification(notification)}
              className={`${tileClass} flex cursor-pointer items-start gap-4 transition-colors hover:border-ring/40 ${notification.status === "unread" ? "border-l-4 border-l-gold" : "opacity-80"}`}
            >
              <input
                type="checkbox"
                checked={selectedNotificationIds.includes(notification.id)}
                onChange={() => toggleNotificationSelection(notification.id)}
                onClick={(event) => event.stopPropagation()}
                aria-label={`Select ${notificationTitle(notification)}`}
                className="mt-2 h-4 w-4 shrink-0 accent-[var(--navy)]"
              />
              <span
                className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${notification.status === "unread" ? "bg-navy text-gold" : "bg-muted text-muted-foreground"}`}
              >
                <Bell className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="flex items-center gap-2 text-sm">
                  {notificationTitle(notification)}
                  {notification.status === "unread" && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-gold" aria-label="Unread" />
                  )}
                </strong>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {notification.message}
                </span>
                <small className="mt-2 block text-xs text-muted-foreground">
                  {new Date(notification.created_at).toLocaleDateString()}
                </small>
              </span>
              <div className="flex shrink-0 items-center gap-2">
                {notification.status === "unread" && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      markServerNotificationRead(notification.id)
                        .then((updated) =>
                          setServerNotifications((current) =>
                            current.map((item) => (item.id === updated.id ? updated : item)),
                          ),
                        )
                        .catch(() => undefined);
                    }}
                    className={`${secondaryButtonClass} h-8 px-3 text-xs`}
                  >
                    <Check className="h-3.5 w-3.5" /> Mark as read
                  </button>
                )}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    deleteNotification(notification.id);
                  }}
                  aria-label="Delete notification"
                  title="Delete notification"
                  className="grid h-8 w-8 place-items-center rounded-lg border border-border/60 bg-card text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {serverNotifications.length === 0 && (
            <div className={`${tileClass} py-10 text-center`}>
              <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-lg bg-muted text-muted-foreground">
                <CheckCheck className="h-5 w-5" />
              </span>
              <p className="font-semibold">Your inbox is clear.</p>
              <p className="mt-1 text-sm text-muted-foreground">New alerts will show up here.</p>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
