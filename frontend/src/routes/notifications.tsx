import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { clearServerNotifications, deleteServerNotification, getServerNotifications, markServerNotificationRead, type ServerNotification } from "@/lib/api";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Bulan SeniorCare" }] }),
  component: Notifications,
});

function Notifications() {
  const navigate = useNavigate();
  const [serverNotifications, setServerNotifications] = useState<ServerNotification[]>([]);

  function notificationTitle(notification: ServerNotification) {
    if (notification.source_type === "benefit_release") return "Benefit release schedule";
    if (notification.source_type === "announcement") return "Announcement update";
    if (notification.message.toLowerCase().includes("comment")) return "Announcement comment";
    return "System notification";
  }

  useEffect(() => {
    getServerNotifications()
      .then((notifications) => {
        setServerNotifications(notifications);
        const unread = notifications.filter((notification) => notification.status === "unread");
        if (unread.length === 0) return;
        return Promise.all(unread.map((notification) => markServerNotificationRead(notification.id)));
      })
      .then((updated) => {
        if (!updated) return;
        const updatedById = new Map(updated.map((notification) => [notification.id, notification]));
        setServerNotifications((current) => current.map((notification) => updatedById.get(notification.id) ?? notification));
        window.dispatchEvent(new Event("bulan-unread-updated"));
      })
      .catch(() => setServerNotifications([]));
  }, []);

  function markAllServerNotificationsRead() {
    Promise.all(
      serverNotifications
        .filter((notification) => notification.status === "unread")
        .map((notification) => markServerNotificationRead(notification.id)),
    ).then((updated) => {
      const updatedById = new Map(updated.map((notification) => [notification.id, notification]));
      setServerNotifications((current) => current.map((notification) => updatedById.get(notification.id) ?? notification));
      window.dispatchEvent(new Event("bulan-unread-updated"));
    }).catch(() => undefined);
  }

  function deleteNotification(id: number) {
    deleteServerNotification(id)
      .then(() => setServerNotifications((current) => current.filter((notification) => notification.id !== id)))
      .catch(() => undefined);
  }

  function clearAllNotifications() {
    clearServerNotifications()
      .then(() => setServerNotifications([]))
      .catch(() => undefined);
  }

  function handleOpenServerNotification(notification: ServerNotification) {
    const markRead = notification.status === "unread"
      ? markServerNotificationRead(notification.id)
          .then((updated) => setServerNotifications((current) => current.map((item) => item.id === updated.id ? updated : item)))
          .catch(() => undefined)
      : Promise.resolve();
    const destination = notification.source_type === "announcement" && notification.source_id
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
      <section className="surface-card p-7">
        <div className="flex items-center gap-3">
          <div className="bg-navy grid h-10 w-10 place-items-center rounded-full text-primary-foreground">
            <Bell className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Inbox</h2>
            <p className="text-sm text-muted-foreground">
              Age threshold, benefit, report, and workflow notifications.
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={markAllServerNotificationsRead}
            disabled={!serverNotifications.some((notification) => notification.status === "unread")}
            className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" /> Mark all as read
          </button>
          <button
            type="button"
            onClick={clearAllNotifications}
            disabled={serverNotifications.length === 0}
            className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-bold text-destructive disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" /> Clear all
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {serverNotifications.map((notification) => (
            <div
              key={`server-${notification.id}`}
              onClick={() => handleOpenServerNotification(notification)}
              className={`flex items-start gap-4 rounded-2xl p-5 ${notification.status === "unread" ? "bg-secondary" : "bg-secondary/60"}`}
            >
              <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold text-gold-foreground">
                <Bell className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block text-sm">{notificationTitle(notification)}</strong>
                <span className="mt-1 block text-xs text-muted-foreground">{notification.message}</span>
                <small className="mt-2 block text-xs text-muted-foreground">
                  {new Date(notification.created_at).toLocaleDateString()}
                </small>
              </span>
              <div className="flex shrink-0 items-center gap-2">
                {notification.status === "unread" && (
                  <button type="button" onClick={(event) => { event.stopPropagation(); markServerNotificationRead(notification.id).then((updated) => setServerNotifications((current) => current.map((item) => item.id === updated.id ? updated : item))).catch(() => undefined); }} className="inline-flex items-center gap-1 rounded-full bg-card px-3 py-2 text-xs font-bold">
                    <Check className="h-3.5 w-3.5" /> Mark as read
                  </button>
                )}
                <button type="button" onClick={(event) => { event.stopPropagation(); deleteNotification(notification.id); }} aria-label="Delete notification" title="Delete notification" className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {serverNotifications.length === 0 && (
            <p className="rounded-2xl bg-secondary p-8 text-center text-sm text-muted-foreground">
              Your inbox is clear.
            </p>
          )}
        </div>
      </section>
    </AppShell>
  );
}
