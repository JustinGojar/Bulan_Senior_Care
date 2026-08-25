import { createFileRoute } from "@tanstack/react-router";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  deleteNotification,
  getNotificationState,
  INITIAL_NOTIFICATIONS,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
  NOTIFICATIONS_CHANGED_EVENT,
  type NotificationItem,
} from "@/lib/notifications";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Bulan SeniorCare" }] }),
  component: Notifications,
});

function Notifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [read, setRead] = useState<string[]>([]);

  function refreshNotifications() {
    const state = getNotificationState();
    setRead(state.read);
    setNotifications(INITIAL_NOTIFICATIONS.filter((notification) => !state.deleted.includes(notification.id)));
  }

  useEffect(() => {
    refreshNotifications();
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, refreshNotifications);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, refreshNotifications);
  }, []);

  function handleMarkRead(id: string) {
    markNotificationRead(id);
  }

  function handleOpenNotification(id: string) {
    markNotificationRead(id);
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
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={markAllNotificationsRead}
            disabled={!notifications.some((notification) => !read.includes(notification.id))}
            className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" /> Mark all as read
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {notifications.map(({ id, title, body, date }) => (
            <div
              key={id}
              role="button"
              tabIndex={0}
              onClick={() => handleOpenNotification(id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleOpenNotification(id);
                }
              }}
              className={`flex items-start gap-4 rounded-2xl p-5 ${read.includes(id) ? "bg-secondary/60" : "bg-secondary"}`}
            >
              <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold text-gold-foreground">
                <Bell className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap justify-between gap-2">
                  <strong className="text-sm">{title}</strong>
                  <small className="text-xs text-muted-foreground">{date}</small>
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">{body}</span>
              </span>
              <div className="flex shrink-0 items-center gap-2">
                {!read.includes(id) ? (
                  <button
                    type="button"
                    onClick={() => handleMarkRead(id)}
                    className="inline-flex items-center gap-1 rounded-full bg-card px-3 py-2 text-xs font-bold"
                  >
                    <Check className="h-3.5 w-3.5" /> Mark as read
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      markNotificationUnread(id);
                    }}
                    className="inline-flex items-center gap-1 rounded-full bg-card px-3 py-2 text-xs font-bold"
                  >
                    <Check className="h-3.5 w-3.5 text-success" /> Mark as unread
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => deleteNotification(id)}
                  aria-label={`Delete ${title}`}
                  className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {notifications.length === 0 && (
            <p className="rounded-2xl bg-secondary p-8 text-center text-sm text-muted-foreground">
              Your inbox is clear.
            </p>
          )}
        </div>
      </section>
    </AppShell>
  );
}
